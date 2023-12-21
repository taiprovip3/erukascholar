function updateUserSession(req, newObject) {
    // Kiểm tra nếu req.session.user không tồn tại hoặc không phải là một đối tượng
    if (!req.session.user || typeof req.session.user !== 'object') {
        // Nếu không, tạo một đối tượng mới và gán cho req.session.user
        req.session.user = {};
    }

    // Tạo một bản sao của req.session.user bằng cách sử dụng spread operator
    const updatedUser = { ...req.session.user };

    // Cập nhật giá trị mới từ newObject
    Object.assign(updatedUser, newObject);

    // Gán lại giá trị mới cho req.session.user
    req.session.user = updatedUser;

    console.log('req.session.user=', req.session.user);
}

module.exports = updateUserSession;