import { RoomService } from "../services/room.service.js";

export class RoomController {
  static async list(req, res, next) {
    try {
      const { type, size, status, search, page, limit } = req.query;
      const result = await RoomService.listRooms({
        type,
        size,
        status,
        search,
        page,
        limit,
      });
      return res.json({
        success: true,
        data: result.rooms,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const room = await RoomService.getRoomById(req.params.roomId);
      return res.json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const newRoom = await RoomService.createRoom(req.body);
      return res.status(201).json({
        success: true,
        data: newRoom,
        message: `Tạo phòng '${newRoom.roomId}' thành công.`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const updatedRoom = await RoomService.updateRoom(req.params.roomId, req.body);
      return res.json({
        success: true,
        data: updatedRoom,
        message: `Cập nhật phòng '${updatedRoom.roomId}' thành công.`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await RoomService.deleteRoom(req.params.roomId);
      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
