const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
      validate: {
        validator: function () {
          return this.googleId || this.password;
        },
        message: "Password is required for non-OAuth accounts",
      },
    },
    passwordChangedAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ["admin", "student", "staff", "teacher"],
      default: "student",
    },
    xp: {
      type: Number,
      default: 0,
      index: true,
    },
    level: {
      type: Number,
      default: 1,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    avatar: {
      type: String,
      default: "",
    },
    avatarPublicId: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 15,
    },
    birthDate: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    followedCategories: {
      type: [String],
      default: [],
    },
    subscriptionTier: {
      type: String,
      enum: ["Free", "Student Plus", "Student Pro"],
      default: "Free",
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    subscriptionExpiry: {
      type: Date,
      default: null,
    },
    dailyAIQueriesCount: {
      type: Number,
      default: 0,
    },
    lastAIQueryDate: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function preSave() {
  if (!this.isModified("password")) {
    return;
  }

  try {
    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }
  } catch (err) {
    throw err;
  }
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createEmailVerificationToken =
  function createEmailVerificationToken() {
    const token = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    return token;
  };

userSchema.methods.createPasswordResetToken =
  function createPasswordResetToken() {
    const token = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000;

    return token;
  };

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
