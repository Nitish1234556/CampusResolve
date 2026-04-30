const Notification = require("../models/notification");

async function createNotification(userId, message, link="#") {

  await Notification.create({
    userId,
    message,
    link,
    isNew: true
  });

  // keep only last 5 notifications
  const notifications = await Notification
    .find({ userId })
    .sort({ createdAt: -1 });

  if(notifications.length > 8){

    const remove = notifications.slice(8);

    const ids = remove.map(n => n._id);

    await Notification.deleteMany({
      _id: { $in: ids }
    });

  }

}

module.exports = { createNotification };