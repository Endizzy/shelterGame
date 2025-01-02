const Router = require('express')
const router = Router();
const controller = require('./authController');
const {check} = require("express-validator") // Проверяем не поступает ли пустой запрос с регистрацией

router.post('/registration', [
    check("username", "Username can not be empty").notEmpty(),
    check("password", "Пароль должен быть не меньше 4 символов и не больше 12").isLength({ min: 4, max: 12 }),
], controller.registration)
router.post('/login', controller.login)
router.get('/users', controller.getUsers)

module.exports = router;