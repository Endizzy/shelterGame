const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const {secret} = require('./config');

const generateAccessToken = (id, roles) => {
    const payload = {
        id,
        roles
    }
    return jwt.sign(payload, secret, { expiresIn: "5h" })
}

class authController {
    async registration(req, res) {
        try {
            const errors = validationResult(req)
            if(!errors.isEmpty()) {
                return res.status(400).json({message: "Ошибка регистрации", errors});
            }
            const {username, password} = req.body
            const condidate = await User.findOne({username})
            if (condidate) {
                return res.status(400).json({message: 'Пользователь уже существует'})
            }
            const hashPassword = bcrypt.hashSync(password, 7);
            const userRole = await Role.findOne({value: "USER"})
            const user = new User({username, password: hashPassword, roles: [userRole.value]})
            await user.save()
            return res.status(200).json({message: 'Успешная регистрация!'});
        } catch (e) {
            console.log(e)
            res.status(400).json({message:"Registration failed"})
        }
    }
    async login(req, res) {
        try {
            const {username, password } = req.body
            const user = await User.findOne({username})
            if (!user) {
                return res.status(400).json({message: `Пользователь ${username} не зарегистрирован`})
            }
            const validPassword = bcrypt.compareSync(password, user.password)
            if (!validPassword) {
                return res.status(400).json({message: "Введен не верный пароль"})
            }
            const token = generateAccessToken(user._id, user.roles)
            return res.json({token})
        } catch (e) {
            console.log(e)
            res.status(400).json({message:"Login failed"});
        }
    }
    async verifyToken(req, res) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        try {
            const decoded = jwt.verify(token, secret);
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json({ username: user.username });
        } catch (error) {
            res.status(403).json({ message: "Invalid token" });
        }
    }
    async getUsers(req, res) {
        try {
            res.json("server work");
        } catch (e) {

        }
    }
}

module.exports = new authController();