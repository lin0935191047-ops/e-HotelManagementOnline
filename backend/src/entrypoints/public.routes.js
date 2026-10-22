import { Router } from "express";
import { prisma } from "../common/prisma.js";

const router = Router();

// Endpoint danh sách phòng công khai cho khách hàng xem và tìm kiếm
router.get("/rooms", async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { status: "AVAILABLE" },
      select: {
        roomId: true,
        type: true,
        size: true,
        price: true,
        maxAdults: true,
        maxChildren: true,
        extraChildFee: true,
        description: true,
        pictures: true,
        status: true,
      },
    });

    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint kiểm tra cổng đặt phòng
router.get("/ping", (req, res) => {
  res.json({
    success: true,
    module: "public",
    message: "Public booking portal is accessible without authentication.",
  });
});

export default router;
