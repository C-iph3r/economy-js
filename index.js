const mongoose = require('mongoose');
const economy = require('./models/economy');
const dailycd = 8.64e+7;

mongoose.set('useFindAndModify', false);

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
          //  useNewUrlParser: true,
          //  useUnifiedTopology: true
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

        const user = await economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new economy({ userID, guildID });
            await newUser.save().catch(console.error);
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
        if (!amount) throw new TypeError("Please provide an amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new economy({ userID, guildID });
            await newUser.save().catch(console.error);
            return { amount };
        }

        user.wallet += parseInt(amount, 10);
        await user.save().catch(console.error);
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
        if (!amount) throw new TypeError("Please provide an amount");
        if (isNaN(amount)) throw new TypeError("The amount should be a number");
        if (amount < 0) throw new TypeError("Amount can't be less than zero");

        const user = await economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new economy({ userID, guildID });
            await newUser.save().catch(console.error);
            return { amount: 0 };
        }

        if (amount > user.wallet) {
            const deductedAmount = user.wallet;
            user.wallet = 0;
            await user.save().catch(console.error);
            return { amount: deductedAmount };
        }

        user.wallet -= parseInt(amount, 10);
        await user.save().catch(console.error);
        return { amount };
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
        if (!capacity) throw new TypeError("Please provide an amount");
        if (isNaN(capacity)) throw new TypeError("The amount should be a number");
        if (capacity < 0) throw new TypeError("Can't give bank space less than zero");

        const user = await economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new economy({ userID, guildID, bankCapacity: 2500 + parseInt(capacity, 10) });
            await newUser.save().catch(console.error);
            return { capacity };
        }

        user.bankCapacity += parseInt(capacity, 10);
        await user.save().catch(console.error);
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

        const user = await economy.findOne({ userID, guildID });
        if (user) return { exists: true };

        const newUser = new economy({ userID, guildID, wallet: 0, bank: 0, bankCapacity: 2500 });
        await newUser.save().catch(console.error);
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

        const user = await economy.findOne({ userID, guildID });
        if (!user) return { exists: false };

        await user.remove().catch(console.error);
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
        if (!count) throw new TypeError("You didn't provide the number of users");
        if (isNaN(count)) throw new TypeError("The number of users must be a number");

        const users = await economy.find({ guildID }).sort([['wallet', 'descending']]).exec();
        return users.slice(0, count);
    },

    /**
     * Get daily reward
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @param {number} amount - Amount of daily reward
     * @returns {Object} - Reward details
     */
    async daily(userID, guildID, amount) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");
        if (!amount) throw new TypeError("Please provide an amount");

        const user = await economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new economy({ userID, guildID });
            await newUser.save().catch(console.error);
            return { amount: 0 };
        }

        if (dailycd - (Date.now() - user.daily) > 0) {
            const millisec = dailycd - (Date.now() - user.daily);
            const seconds = Math.floor(millisec / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            const cdL = `${hours ? `${hours} Hour(s), ` : ''}${minutes % 60} Minute(s), ${seconds % 60} Seconds.`;
            return { cd: true, cdL, seconds, minutes, hours };
        }

        user.daily = Date.now();
        user.wallet += parseInt(amount, 10);
        await user.save().catch(console.error);
        return { amount };
    },

    /**
     * Deposit coins into the bank
     * @param {string} userID - ID of the User
     * @param {string} guildID - ID of the Guild
     * @param {number} amount - Amount to deposit
     * @returns {Object} - Deposit status
     */
    async deposit(userID, guildID, amount) {
        if (!userID) throw new TypeError("Please provide a User ID");
        if (!guildID) throw new TypeError("Please provide a Guild ID");
        if (amount < 0) throw new TypeError("Deposit amount cannot be less than zero");

        const user = await economy.findOne({ userID, guildID });
        if (!user) {
            const newUser = new economy({ userID, guildID, wallet: amount, bank: 0, bankCapacity: 2500 });
            await newUser.save().catch(console.error);
            return { noten: false, amount };
        }

        if (amount > user.wallet) {
            return { noten: true };
        }

        user.wallet -= amount;
        user.bank += amount;
        await user.save().catch(console.error);
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

        const user = await economy.findOne({ userID, guildID });
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
        await user.save().catch(console.error);
        return { amount };
    },
};
