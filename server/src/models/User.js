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
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function preSave() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
});

userSchema.methods.comparePassword = function comparePassword(
  candidatePassword
) {
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

module.exports = mongoose.model("User", userSchema);
