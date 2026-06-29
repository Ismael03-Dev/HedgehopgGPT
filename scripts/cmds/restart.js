const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "restart",
		version: "1.1",
		author: "NTKhang",
		countDown: 5,
		role: 2,
		description: {
			vi: "Khởi động lại bot",
			en: "Restart bot"
		},
		category: "Owner",
		guide: {
			vi: "   {pn}: Khởi động lại bot",
			en: "   {pn}: Restart bot"
		}
	},

	langs: {
		vi: {
			restartting: "🔄 | Đang khởi động lại bot..."
		},
		en: {
			restartting: "🔄 | Restarting bot..."
		}
	},

	onLoad: function ({ api }) {
		const pathFile = path.join(__dirname, "tmp", "restart.txt");
		if (fs.existsSync(pathFile)) {
			try {
				const [tid, time] = fs.readFileSync(pathFile, "utf-8").split(" ");
				fs.unlinkSync(pathFile);
				setTimeout(() => {
					api.sendMessage(`✅ | Bot restarted\n⏰ | Time: ${(Date.now() - time) / 1000}s`, tid)
						.catch(err => console.error("[restart] Failed to send restart message:", err.message));
				}, 5000);
			} catch (err) {
				console.error("[restart] Error handling restart file:", err.message);
			}
		}
	},

	onStart: async function ({ message, event, getLang }) {
		const pathFile = path.join(__dirname, "tmp", "restart.txt");
		try {
			if (!fs.existsSync(path.join(__dirname, "tmp"))) {
				fs.mkdirSync(path.join(__dirname, "tmp"));
			}
			fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);
			await message.reply(getLang("restartting"));
			process.exit(2);
		} catch (err) {
			console.error("[restart] Error during restart:", err.message);
			await message.reply("❌ | Failed to restart bot.");
		}
	}
};