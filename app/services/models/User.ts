import mongoose from "mongoose";

export interface UserInterface extends mongoose.Document {
  email: string;
}

const UserSchema = new mongoose.Schema<UserInterface>(
  {
    email: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User ||
  mongoose.model<UserInterface>("User", UserSchema);
