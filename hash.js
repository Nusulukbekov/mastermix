const bcrypt = require("bcrypt");

bcrypt.hash("123456", 10).then(hash => {
  console.log(hash);
});

// psql "postgresql://postgres:GmKPFqUxbPzYGnHOjRUtOCrHwxGrXKma@gondola.proxy.rlwy.net:52009/railway"
// INSERT INTO users (username, password, role)
// VALUES ('admin', '$2b$10$Z6Rw..6u/Ka7vR9FJ3o8M.qxQRQ5tBBX5fV.BAIP/COcYmMGKv1zu', 'admin');
//hashh \d vehicles