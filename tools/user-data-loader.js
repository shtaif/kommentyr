const
    UserModel = require('../models/user-model'),
    { ImprovedDataLoader } = require('../tools/data-loader');


module.exports.userDataLoaderMultiple = new ImprovedDataLoader(
    async userIds => {
        return await UserModel.find({ _id: { $in: userIds } });
    },
    (id, user) => {
        return id.toString() === user._id.toString();
    },
    { returnMultiple: true }
);


module.exports.userDataLoaderSingle = new ImprovedDataLoader(
    async userIds => {
        return await UserModel.find({ _id: { $in: userIds } });
    },
    (id, user) => {
        return id.toString() === user._id.toString();
    },
    { returnMultiple: false }
);
