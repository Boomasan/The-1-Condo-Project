const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware สำหรับ parse JSON
app.use(express.json());

// ไฟล์สำหรับเก็บข้อมูล
const DATA_FILE = path.join(__dirname, 'data.json');

// ฟังก์ชันโหลดข้อมูลจากไฟล์
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const parsedData = JSON.parse(data);
      return {
        rooms: parsedData.rooms || [],
        customers: parsedData.customers || []
      };
    }
  } catch (error) {
    console.error('Error loading data:', error.message);
  }
  
  // ถ้าไม่มีไฟล์หรือเกิดข้อผิดพลาด ให้สร้างข้อมูลเริ่มต้น
  return {
    rooms: [],
    customers: []
  };
};

// ฟังก์ชันบันทึกข้อมูลลงไฟล์
const saveData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error.message);
  }
};

// โหลดข้อมูลเมื่อเริ่มต้น server
const data = loadData();
let rooms = data.rooms;
let Customers = data.customers;

console.log(`Loaded ${Rooms.length} rooms and ${Customers.length} customers from storage`);

// ฟังก์ชันช่วยสำหรับบันทึกข้อมูล
const saveAllData = () => {
  saveData({ rooms: Rooms, customers: Customers });
};

// === API สำหรับ Rooms ===

// GET - ดึงข้อมูลห้องทั้งหมด
app.get('/Rooms', (req, res) => {
  res.json(Rooms);
});

// GET - ดึงข้อมูลห้องตาม ID
app.get('/Rooms/:id', (req, res) => {
  const Roomid = parseInt(req.params.id); // แก้ไข syntax error
  const Room = Rooms.find(r => r.id === Roomid);

  if (Room) {
    res.json(Room);
  } else {
    res.status(404).send("ไม่พบห้องที่ระบุ");
  }
});

// POST - เพิ่มห้องใหม่
app.post('/Rooms', (req, res) => {
  const newId = Rooms.length > 0 ? Math.max(...Rooms.map(r => r.id)) + 1 : 1;
  const newRoom = { 
    id: newId, 
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  Rooms.push(newRoom);
  saveAllData(); // บันทึกข้อมูลลงไฟล์
  
  res.status(201).json(newRoom);
});

// PUT - แก้ไขห้อง
app.put('/Rooms/:id', (req, res) => {
  const Roomid = parseInt(req.params.id);
  const index = Rooms.findIndex(r => r.id === Roomid);
  
  if (index !== -1) {
    const originalRoom = Rooms[index];
    Rooms[index] = { 
      id: Roomid, 
      ...req.body,
      createdAt: originalRoom.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    saveAllData(); // บันทึกข้อมูลลงไฟล์
    res.json(Rooms[index]);
  } else {
    res.status(404).send("ไม่พบห้องที่ระบุ");
  }
});

// DELETE - ลบห้อง
app.delete('/Rooms/:id', (req, res) => {
  const Roomid = parseInt(req.params.id);
  const index = Rooms.findIndex(r => r.id === Roomid);
  
  if (index !== -1) {
    // ตรวจสอบว่ามีลูกบ้านในห้องนี้หรือไม่
    const customersInRoom = Customers.filter(c => c.roomId === Roomid);
    if (customersInRoom.length > 0) {
      return res.status(400).json({
        error: "ไม่สามารถลบห้องได้ เนื่องจากมีลูกบ้านอยู่ในห้องนี้",
        customersCount: customersInRoom.length
      });
    }

    const deletedRoom = Rooms.splice(index, 1)[0];
    saveAllData(); // บันทึกข้อมูลลงไฟล์
    res.json(deletedRoom);
  } else {
    res.status(404).send("ไม่พบห้องที่ระบุ");
  }
});

// === API สำหรับ Customers (ลูกบ้าน) ===

// GET - ดึงข้อมูลลูกบ้านทั้งหมด
app.get('/Customers', (req, res) => {
  // รวมข้อมูลห้องเข้าไปด้วย
  const customersWithRoomInfo = Customers.map(customer => {
    const room = Rooms.find(r => r.id === customer.roomId);
    return {
      ...customer,
      roomName: room ? room.name : null,
      roomType: room ? room.type : null
    };
  });
  
  res.json(customersWithRoomInfo);
});

// GET - ดึงข้อมูลลูกบ้านตาม ID
app.get('/Customers/:id', (req, res) => {
  const customerId = parseInt(req.params.id);
  const customer = Customers.find(c => c.id === customerId);

  if (customer) {
    // รวมข้อมูลห้องเข้าไปด้วย
    const room = Rooms.find(r => r.id === customer.roomId);
    const customerWithRoomInfo = {
      ...customer,
      roomName: room ? room.name : null,
      roomType: room ? room.type : null
    };
    
    res.json(customerWithRoomInfo);
  } else {
    res.status(404).send("ไม่พบข้อมูลลูกบ้านที่ระบุ");
  }
});

// POST - เพิ่มลูกบ้านใหม่
app.post('/Customers', (req, res) => {
  // ตรวจสอบข้อมูลที่จำเป็น
  const { name, phone, roomId } = req.body;
  
  if (!name || !phone) {
    return res.status(400).json({ 
      error: "กรุณาระบุชื่อและเบอร์โทรศัพท์" 
    });
  }

  // ตรวจสอบว่าห้องมีอยู่จริงหรือไม่ (ถ้าระบุ roomId)
  if (roomId) {
    const room = Rooms.find(r => r.id === roomId);
    if (!room) {
      return res.status(400).json({ 
        error: "ไม่พบห้องที่ระบุ" 
      });
    }
  }

  const newId = Customers.length > 0 ? Math.max(...Customers.map(c => c.id)) + 1 : 1;
  const newCustomer = { 
    id: newId, 
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  Customers.push(newCustomer);
  saveAllData(); // บันทึกข้อมูลลงไฟล์
  
  // รวมข้อมูลห้องเข้าไปด้วย
  const room = Rooms.find(r => r.id === newCustomer.roomId);
  const customerWithRoomInfo = {
    ...newCustomer,
    roomName: room ? room.name : null,
    roomType: room ? room.type : null
  };
  
  res.status(201).json(customerWithRoomInfo);
});

// PUT - แก้ไขข้อมูลลูกบ้าน
app.put('/Customers/:id', (req, res) => {
  const customerId = parseInt(req.params.id);
  const index = Customers.findIndex(c => c.id === customerId);
  
  if (index === -1) {
    return res.status(404).send("ไม่พบข้อมูลลูกบ้านที่ระบุ");
  }

  // ตรวจสอบว่าห้องมีอยู่จริงหรือไม่ (ถ้าระบุ roomId ใหม่)
  if (req.body.roomId) {
    const room = Rooms.find(r => r.id === req.body.roomId);
    if (!room) {
      return res.status(400).json({ 
        error: "ไม่พบห้องที่ระบุ" 
      });
    }
  }

  // เก็บข้อมูลเก่าบางส่วน
  const originalCustomer = Customers[index];
  Customers[index] = { 
    id: customerId, 
    ...req.body,
    createdAt: originalCustomer.createdAt,
    updatedAt: new Date().toISOString()
  };
  
  saveAllData(); // บันทึกข้อมูลลงไฟล์
  
  // รวมข้อมูลห้องเข้าไปด้วย
  const room = Rooms.find(r => r.id === Customers[index].roomId);
  const customerWithRoomInfo = {
    ...Customers[index],
    roomName: room ? room.name : null,
    roomType: room ? room.type : null
  };
  
  res.json(customerWithRoomInfo);
});

// DELETE - ลบข้อมูลลูกบ้าน
app.delete('/Customers/:id', (req, res) => {
  const customerId = parseInt(req.params.id);
  const index = Customers.findIndex(c => c.id === customerId);
  
  if (index !== -1) {
    const deletedCustomer = Customers.splice(index, 1)[0];
    saveAllData(); // บันทึกข้อมูลลงไฟล์
    res.json(deletedCustomer);
  } else {
    res.status(404).send("ไม่พบข้อมูลลูกบ้านที่ระบุ");
  }
});

// GET - ดึงข้อมูลลูกบ้านตามห้อง
app.get('/Rooms/:roomId/Customers', (req, res) => {
  const roomId = parseInt(req.params.roomId);
  
  // ตรวจสอบว่าห้องมีอยู่จริง
  const room = Rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).send("ไม่พบห้องที่ระบุ");
  }

  const customersInRoom = Customers.filter(c => c.roomId === roomId);
  
  // รวมข้อมูลห้องเข้าไปด้วย
  const customersWithRoomInfo = customersInRoom.map(customer => ({
    ...customer,
    roomName: room.name,
    roomType: room.type
  }));
  
  res.json(customersWithRoomInfo);
});

// GET - ค้นหาลูกบ้านตามชื่อ
app.get('/Customers/search/:name', (req, res) => {
  const searchName = req.params.name.toLowerCase();
  const foundCustomers = Customers.filter(c => 
    c.name && c.name.toLowerCase().includes(searchName)
  );
  
  // รวมข้อมูลห้องเข้าไปด้วย
  const customersWithRoomInfo = foundCustomers.map(customer => {
    const room = Rooms.find(r => r.id === customer.roomId);
    return {
      ...customer,
      roomName: room ? room.name : null,
      roomType: room ? room.type : null
    };
  });
  
  res.json(customersWithRoomInfo);
});

// GET - สถิติข้อมูล
app.get('/stats', (req, res) => {
  const stats = {
    totalRooms: Rooms.length,
    totalCustomers: Customers.length,
    occupiedRooms: Rooms.filter(room => 
      Customers.some(customer => customer.roomId === room.id)
    ).length,
    emptyRooms: Rooms.filter(room => 
      !Customers.some(customer => customer.roomId === room.id)
    ).length,
    customersWithoutRoom: Customers.filter(c => !c.roomId).length
  };
  
  res.json(stats);
});

// ฟังก์ชันสำรองข้อมูล
app.post('/backup', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(__dirname, `backup-${timestamp}.json`);
    
    const backupData = {
      rooms: Rooms,
      customers: Customers,
      backupDate: new Date().toISOString()
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    res.json({
      message: "สำรองข้อมูลเรียบร้อยแล้ว",
      file: `backup-${timestamp}.json`,
      totalRooms: Rooms.length,
      totalCustomers: Customers.length
    });
  } catch (error) {
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการสำรองข้อมูล" });
  }
});

// บันทึกข้อมูลก่อนปิด server
process.on('SIGINT', () => {
  console.log('\n💾 Saving data before shutdown...');
  saveAllData();
  console.log('✅ Data saved successfully');
  console.log('👋 Server shutdown');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n💾 Saving data before shutdown...');
  saveAllData();
  console.log('✅ Data saved successfully');
  console.log('👋 Server shutdown');
  process.exit(0);
});

// บันทึกข้อมูลทุกๆ 5 นาที (Auto-save)
setInterval(() => {
  saveAllData();
  console.log(`🔄 Auto-save completed at ${new Date().toLocaleString()}`);
}, 5 * 60 * 1000); // 5 minutes

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log('📊 Available endpoints:');
  console.log('   📁 Rooms:');
  console.log('   - GET    /Rooms - ดึงข้อมูลห้องทั้งหมด');
  console.log('   - GET    /Rooms/:id - ดึงข้อมูลห้องตาม ID');
  console.log('   - POST   /Rooms - เพิ่มห้องใหม่');
  console.log('   - PUT    /Rooms/:id - แก้ไขห้อง');
  console.log('   - DELETE /Rooms/:id - ลบห้อง');
  console.log('   👥 Customers:');
  console.log('   - GET    /Customers - ดึงข้อมูลลูกบ้านทั้งหมด');
  console.log('   - GET    /Customers/:id - ดึงข้อมูลลูกบ้านตาม ID');
  console.log('   - POST   /Customers - เพิ่มลูกบ้านใหม่');
  console.log('   - PUT    /Customers/:id - แก้ไขข้อมูลลูกบ้าน');
  console.log('   - DELETE /Customers/:id - ลบข้อมูลลูกบ้าน');
  console.log('   - GET    /Rooms/:roomId/Customers - ดึงลูกบ้านในห้องที่ระบุ');
  console.log('   - GET    /Customers/search/:name - ค้นหาลูกบ้านตามชื่อ');
  console.log('   📈 Others:');
  console.log('   - GET    /stats - สถิติข้อมูล');
  console.log('   - POST   /backup - สำรองข้อมูล');
  console.log('💾 Data storage: JSON file (data.json)');
  console.log('🔄 Auto-save: Every 5 minutes');
});