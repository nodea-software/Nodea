const crypto = require("crypto");
const dayjs = require("dayjs");
const { token } = require("@config/global");

const generateToken = () => crypto.randomBytes(32).toString("hex");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const setExpiresAt = (type) => {
	let add = 0;
	switch (type) {
		case "FIRST_CONNECTION":
			add = token.first_connection_duration;
			break;
		case "RESET_PASSWORD":
			add = token.reset_password_duration;
			break;
		default:
			break;
	}
	return dayjs().add(add, "minutes").toISOString();
};

module.exports = {
	generateToken,
	hashToken,
	setExpiresAt,
};
