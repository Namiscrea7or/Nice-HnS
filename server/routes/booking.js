const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const User = require("../models/User")
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Table = require("../models/Table");
const BookingRoom = require("../models/BookingRoom");
const BookingTable = require("../models/BookingTable");

// @route GET api/bookings/
// @desc Get all booking information and calculate total amount
// @access Private
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all booking rooms and tables for the user
    const bookingRooms = await BookingRoom.find({ user: userId, state: 'false' });
    const bookingTables = await BookingTable.find({ user: userId, state: 'false' });


    // Get the IDs of all rooms and tables
    const roomBookingIds = bookingRooms.map((booking) => booking.room_type);
    const tableBookingIds = bookingTables.map((booking) => booking.table_type);    

    // Retrieve all rooms and tables with their prices
    const rooms = await Room.find({ _id: { $in: roomBookingIds } });
    const tables = await Table.find({ _id: { $in: tableBookingIds } });

    // Create a detailed list of rooms with prices
    const detailedRooms = rooms.map((room) => ({
      roomType: room.room_type,
      roomNumber: room.room_number,
      description: room.description,
      price: room.price,
    }));

    // Create a detailed list of tables with prices
    const detailedTables = tables.map((table) => ({
      tableType: table.table_type,
      tableNumber: table.table_number,
      price: table.price,
    }));

    // Calculate the sum of prices for all rooms and tables
    const totalRoomPrice = rooms.reduce((sum, room) => sum + room.price, 0);
    const totalTablePrice = tables.reduce((sum, table) => sum + table.price, 0);
    const totalAmount = totalRoomPrice + totalTablePrice;

    res.json({
      success: true,
      user: userId,
      detailedRooms,
      detailedTables,
      totalRoomPrice,
      totalTablePrice,
      totalAmount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// @route PUT api/bookings/payment/
// @desc Process payment and update booking statuses
// @access Private
router.put("/payment", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Update state of all booking rooms to 'true'
    await BookingRoom.updateMany({ user: userId, state: 'false' }, { $set: { state: 'true' } });

    // Update state of all booking tables to 'true'
    await BookingTable.updateMany({ user: userId, state: 'false' }, { $set: { state: 'true' } });

    // Update state of the main booking to 'true'
    await Booking.updateOne({ user: userId, state: 'false' }, { $set: { state: 'true' } });

    res.json({
      success: true,
      message: "Payment successful",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});


// @route POST api/book_room
// @desc Book available room
// @access Public

router.post("/book_room", verifyToken, async (req, res) => {
  const {
    room_number,
    start_room_date,
    end_room_date,
    number_adults,
    number_child
  } = req.body;
  try {
    const guest = await User.findOne({ _id: req.userId });
    if (!guest)
      return res.status(200).json({
        success: false,
        message: "Guest not found!",
      });
    if (guest.role != "Guest")
      return res.status(200).json({
        success: false,
        message: "Access denied!",
      });
    const room = await Room.findOne({ room_number: room_number });
    if (!room) {
      return res.status(200).json({
        success: false,
        message: "Room is not found",
      });
    }
    const startRoomDate = new Date(start_room_date);
    const endRoomDate = new Date(end_room_date);
    if (startRoomDate < new Date()) {
      return res.status(200).json({
        success: false,
        message: "Invalid start date. Start date should be in the future.",
      });
    }
    if (endRoomDate < startRoomDate) {
      return res.status(200).json({
        success: false,
        message: "Invalid date range. End date should be greater than or equal to start date.",
      });
    }
    const existingBookingRooms = await BookingRoom.find({
      room_type: room._id,
      $or: [
        {
          $and: [
            { start_room_date: { $gte: startRoomDate } },
            { start_room_date: { $lte: endRoomDate } },
          ],
        },
        {
          $and: [
            { end_room_date: { $gte: startRoomDate } },
            { end_room_date: { $lte: endRoomDate } },
          ],
        },
        {
          $and: [
            { start_room_date: { $lte: startRoomDate } },
            { end_room_date: { $gte: endRoomDate } },
          ],
        },
      ],
    });
    if (existingBookingRooms.length !== 0) {
      return res.status(200).json({
        success: false,
        message: "Room is booked in these dates",
      });
    }
    const newBookingRoom = new BookingRoom({
      user: guest._id,
      room_type: room._id,
      start_room_date : startRoomDate,
      end_room_date : endRoomDate,
      number_adults: number_adults,
      number_child: number_child,
      state: 'false',
    });
    await newBookingRoom.save();
    return res.status(200).json({
      success: true,
      message: "Room is booked successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
})

// @route POST api/booking/book_table
// @desc Book available table
// @access Public

router.post("/book_table", verifyToken, async (req, res) => {
  const {
    table_number,
    full_name,
    phone_number,
    table_date,
  } = req.body;
  try {
    const guest = await User.findOne({ _id: req.userId });
    if (!guest)
      return res.status(200).json({
        success: false,
        message: "Guest not found!",
      });
    if (guest.role != "Guest")
      return res.status(200).json({
        success: false,
        message: "Access denied!",
      });
    const table = await Table.findOne({ table_number: table_number });
    if (!table) {
      return res.status(200).json({
        success: false,
        message: "Table is not found",
      });
    }
    const tableDate = new Date(table_date);
    if (tableDate < new Date()) {
      return res.status(200).json({
        success: false,
        message: "Invalid start date. Start date should be in the future.",
      });
    }
    const existingBookingTables = await BookingTable.find({
      table_type: table._id,
      table_date: tableDate,
    });
    if (existingBookingTables.length !== 0)
      return res.status(200).json({
        success: false,
        message: "Table is not available in these date!",
      });
    const newBookingTable = new BookingTable({
      user: guest._id,
      table_type: table,
      table_date: tableDate,
      state: 'false',
    });
    await newBookingTable.save();
    return res.status(200).json({
      success: true,
      message: "Table is booked successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
})
module.exports = router;
