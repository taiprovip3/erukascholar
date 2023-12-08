window.encryptPassword = function(password) {
  const bcrypt = dcodeIO.bcrypt
  const encryptedPasswordString = bcrypt.hashSync(password, 10)
  return encryptedPasswordString
}

window.encryptPasswordSHA256 = async function(password) {
  // 01 getRandomSalt
  const salt = generateRandomSalt(16);
  const hash1 = await hashSHA256(password);
  const hash2 = await hashSHA256(hash1 + salt);
  const encryptedPassword = `$SHA$${salt}$${hash2}`;
  return encryptedPassword;
}

function generateRandomSalt(inputLength) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < inputLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    salt += characters.charAt(randomIndex);
  }
  return salt;
}

async function hashSHA256(data) {
  const encoder = new TextEncoder();
  const dataArray = encoder.encode(data);
  try {
    // Sử dụng Web Crypto API để tạo đối tượng hash với thuật toán SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);

    // Chuyển đổi kết quả hash từ ArrayBuffer sang chuỗi hex
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedData = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hashedData;
  } catch (error) {
    console.error('Error:', error);
    throw error; // Chuyển tiếp lỗi để nó có thể được xử lý bởi mã gọi
  }
}