import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    // index: true speed up the search process in the db
    // unique: true also adds index to the field, and also enforces no tow fields carry equal value.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    // All tokens descended from a single login share a family 
    // to avoid reuse hack
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null }, // log out time
    // You track Uganda, chrome on android,
    // if token suddenly used from Russia, its stollen
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);

// MongoDB automatically deletes expired documents.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
