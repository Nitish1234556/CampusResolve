const bcrypt = require("bcryptjs");

bcrypt.hash("student123", 10).then(hash => {
  console.log(hash);
});
