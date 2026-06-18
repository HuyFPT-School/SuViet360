const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

/** @type {Map<string, Set<string>>} userId → Set of socketIds */
const onlineUsers = new Map();

/**
 * Parse a single cookie value from a raw cookie header string.
 * Mirrors the logic in utils/cookies.js but works with raw strings.
 */
const parseCookie = (cookieHeader, key) => {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${key}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(key.length + 1));
};

/**
 * Find the other participant in a conversation.
 * @param {import('mongoose').Document} conversation
 * @param {string} currentUserId
 * @returns {string} other participant's userId as string
 */
const getOtherParticipant = (conversation, currentUserId) => {
  const other = conversation.participants.find(
    (p) => p.toString() !== currentUserId
  );
  return other ? other.toString() : null;
};

/**
 * Get all online user IDs.
 * @returns {string[]}
 */
const getOnlineUserIds = () => Array.from(onlineUsers.keys());

/**
 * Set up all Socket.IO event handlers.
 * @param {import('socket.io').Server} io
 */
const setupSocketHandlers = (io) => {
  /* ─── Authentication middleware ─── */
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const token = parseCookie(cookieHeader, "token");

      if (!token) {
        return next(new Error("Authentication error"));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.jwtSecret);
      } catch {
        return next(new Error("Authentication error"));
      }

      const user = await User.findById(decoded.id);
      if (!user || !user.isEmailVerified) {
        return next(new Error("Authentication error"));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
      };

      return next();
    } catch {
      return next(new Error("Authentication error"));
    }
  });

  /* ─── Connection handler ─── */
  io.on("connection", (socket) => {
    const { id: userId } = socket.user;

    // Track online user (supports multi-tab)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join private room
    socket.join(`user:${userId}`);

    // Broadcast presence to all connected sockets
    socket.broadcast.emit("user_online", { userId });

    // Send current online users list to the newly connected socket
    socket.emit("online_users", { userIds: getOnlineUserIds() });

    /* ─── Event: send_message ─── */
    socket.on("send_message", async (payload) => {
      try {
        const { conversationId, content } = payload || {};

        // Validate content
        if (!content || typeof content !== "string" || !content.trim()) {
          return socket.emit("error_message", {
            message: "Message content is required",
          });
        }
        if (content.length > 2000) {
          return socket.emit("error_message", {
            message: "Message cannot exceed 2000 characters",
          });
        }

        // Verify sender is a participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit("error_message", {
            message: "Conversation not found",
          });
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) {
          return socket.emit("error_message", {
            message: "Not a participant of this conversation",
          });
        }

        // Create message
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          content: content.trim(),
        });

        // Update conversation lastMessage and unreadCount
        const otherUserId = getOtherParticipant(conversation, userId);

        conversation.lastMessage = {
          content: message.content,
          sender: message.sender,
          createdAt: message.createdAt,
        };

        const currentUnread =
          conversation.unreadCount.get(otherUserId) || 0;
        conversation.unreadCount.set(otherUserId, currentUnread + 1);

        await conversation.save();

        // Fetch sender info for the response
        const sender = await User.findById(userId).select("name avatar");

        const messageData = {
          _id: message._id,
          conversation: message.conversation,
          sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar,
          },
          content: message.content,
          readAt: message.readAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        };

        // Emit to other participant
        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit("new_message", messageData);
        }

        // Emit back to sender for multi-tab sync
        io.to(`user:${userId}`).emit("new_message", messageData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("send_message error:", err.message);
        socket.emit("error_message", { message: "Failed to send message" });
      }
    });

    /* ─── Event: typing ─── */
    socket.on("typing", async (payload) => {
      try {
        const { conversationId } = payload || {};
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const otherUserId = getOtherParticipant(conversation, userId);
        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit("user_typing", {
            conversationId,
            userId,
          });
        }
      } catch {
        // Silently ignore typing errors
      }
    });

    /* ─── Event: stop_typing ─── */
    socket.on("stop_typing", async (payload) => {
      try {
        const { conversationId } = payload || {};
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const otherUserId = getOtherParticipant(conversation, userId);
        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit("user_stop_typing", {
            conversationId,
            userId,
          });
        }
      } catch {
        // Silently ignore typing errors
      }
    });

    /* ─── Event: mark_read ─── */
    socket.on("mark_read", async (payload) => {
      try {
        const { conversationId } = payload || {};

        // Mark all unread messages from other user as read
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: userId },
            readAt: null,
          },
          { $set: { readAt: new Date() } }
        );

        // Reset unread count for current user
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        conversation.unreadCount.set(userId, 0);
        await conversation.save();

        // Notify other participant that messages were read
        const otherUserId = getOtherParticipant(conversation, userId);
        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit("messages_read", {
            conversationId,
            userId,
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("mark_read error:", err.message);
      }
    });

    /* ─── Disconnect handler ─── */
    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit("user_offline", { userId });
        }
      }
    });
  });
};

module.exports = { setupSocketHandlers };
