const mongoose = require('mongoose');
const Economy = require('./models/economy');
const dailycd = 8.64e+7;

mongoose.set('strictQuery', false);

let connection;

module.exports = {
    /**
     * Connect to MongoDB
     * @param {string} uri - Mongo Connection URI
     */
    async connect(uri) {
        if (!uri) throw new TypeError("Please provide a Mongoose URI");
        connection = uri;
        return mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    },

    /**
     * Get the balance of a user
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @returns {Object} - Wallet and bank details
     */
    async balance(userID, guildID) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");

        const user = await Economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new Economy({ userID, guildID });
            await newUser.save();
            return { wallet: newUser.wallet, bankCapacity: newUser.bankCapacity, bank: newUser.bank };
        }

        return { wallet: user.wallet, bankCapacity: user.bankCapacity, bank: user.bank };
    },

    /**
     * Give coins to a user
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @param {number} amount - Amount of coins
     * @returns {Object} - Amount given
     */
    async give(userID, guildID, amount) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");
        if (isNaN(amount) || amount < 0) throw new TypeError("Amount should be a positive number");

        const user = await Economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new Economy({ userID, guildID, wallet: amount });
            await newUser.save();
            return { amount };
        }

        user.wallet += parseInt(amount, 10);
        await user.save();
        return { amount };
    },

    /**
     * Deduct coins from a user
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @param {number} amount - Amount of coins
     * @returns {Object} - Amount deducted
     */
    async deduct(userID, guildID, amount) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");
        if (isNaN(amount) || amount < 0) throw new TypeError("Amount should be a positive number");

        const user = await Economy.findOne({ userID, guildID });
        if (!user) {
            return { amount: 0 };
        }

        const deductedAmount = Math.min(user.wallet, amount);
        user.wallet -= deductedAmount;
        await user.save();
        return { amount: deductedAmount };
    },

    /**
     * Increase a user's bank capacity
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @param {number} capacity - New bank capacity
     * @returns {Object} - Updated capacity
     */
    async giveCapacity(userID, guildID, capacity) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");
        if (isNaN(capacity) || capacity < 0) throw new TypeError("Capacity should be a positive number");

        const user = await Economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new Economy({ userID, guildID, bankCapacity: 2500 + parseInt(capacity, 10) });
            await newUser.save();
            return { capacity };
        }

        user.bankCapacity += parseInt(capacity, 10);
        await user.save();
        return { capacity };
    },

    /**
     * Create a new user
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @returns {Object} - Existence of user
     */
    async create(userID, guildID) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");

        const user = await Economy.findOne({ userID, guildID });
        if (user) return { exists: true };

        const newUser = new Economy({ userID, guildID, wallet: 0, bank: 0, bankCapacity: 2500 });
        await newUser.save();
        return { exists: false };
    },

    /**
     * Delete a user
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @returns {Object} - Existence of user
     */
    async delete(userID, guildID) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");

        const user = await Economy.findOne({ userID, guildID });
        if (!user) return { exists: false };

        await user.remove();
        return { exists: true };
    },

    /**
     * Get leaderboard of users
     * @param {string} guildID - ID of the Guild
     * @param {number} count - Number of users
     * @returns {Array} - List of top users
     */
    async lb(guildID, count) {
        if (!guildID) throw new TypeError("Please provide a Guild ID");
        if (isNaN(count)) throw new TypeError("Count should be a number");

        const leaderboard = await Economy.find({ guildID }).sort({ wallet: -1 }).limit(parseInt(count, 10));
        return leaderboard;
    },

    /**
     * Deposit coins into the bank
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @param {number} amount - Amount of coins
     * @returns {Object} - Deposit status
     */
    async deposit(userID, guildID, amount) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");
        if (isNaN(amount) || amount < 0) throw new TypeError("Deposit amount should be a positive number");

        const user = await Economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new Economy({ userID, guildID, wallet: amount, bank: 0, bankCapacity: 2500 });
            await newUser.save();
            return { noten: false, amount };
        }

        if (amount > user.wallet) {
            return { noten: true };
        }

        user.wallet -= amount;
        user.bank += amount;
        await user.save();
        return { noten: false, amount };
    },

    /**
     * Withdraw coins from the bank
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @param {number|string} amount - Amount to withdraw or "all"
     * @returns {Object} - Withdraw status
     */
    async withdraw(userID, guildID, amount) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");

        const user = await Economy.findOne({ userID, guildID });
        if (!user) {
            return { noten: true };
        }

        if (amount === "all") {
            amount = user.bank;
        }

        amount = parseInt(amount, 10);

        if (isNaN(amount) || amount < 0) {
            return { invalid: true };
        }

        if (amount > user.bank) {
            return { noten: true };
        }

        user.wallet += amount;
        user.bank -= amount;
        await user.save();
        return { amount };
    },
};
