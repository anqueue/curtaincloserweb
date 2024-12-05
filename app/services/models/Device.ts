import mongoose from "mongoose";

export interface DeviceInterface extends mongoose.Document {
  openRotations: number;
  closeRotations: number;
  openAt: number;
  closeAt: number;
}

const DeviceSchema = new mongoose.Schema<DeviceInterface>(
  {
    openRotations: { type: Number, required: true },
    closeRotations: { type: Number, required: true },
    openAt: { type: Number, required: true }, // 0000 - 2400
    closeAt: { type: Number, required: true }, // 0000 - 2400
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Device ||
  mongoose.model<DeviceInterface>("Device", DeviceSchema);
