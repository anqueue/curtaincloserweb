import mongoose from "mongoose";

export interface DeviceInterface extends mongoose.Document {
  openRotations: number;
  closeRotations: number;
  openAt: number;
  closeAt: number;
  swapOpenClose: boolean;
}

const DeviceSchema = new mongoose.Schema<DeviceInterface>(
  {
    openRotations: { type: Number, required: true },
    closeRotations: { type: Number, required: true },
    openAt: { type: Number, required: true }, // 0000 - 2400
    closeAt: { type: Number, required: true }, // 0000 - 2400
    swapOpenClose: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Device ||
  mongoose.model<DeviceInterface>("Device", DeviceSchema);
