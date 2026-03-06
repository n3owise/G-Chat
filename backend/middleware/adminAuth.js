const jwt = require('jsonwebtoken');

exports.protectAdmin = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized as admin' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        req.admin = { username: decoded.username };
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid admin token' });
    }
};
