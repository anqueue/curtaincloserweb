import * as mongoose from "mongoose";

export interface UserInterface {
  email: string;
}

export let _interface: UserInterface;

const _schema = new mongoose.Schema<typeof _interface>(
  {
    email: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

export const User =
  mongoose?.models?.User || mongoose.model<typeof _interface>("User", _schema);
