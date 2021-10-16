var mongoose = require('mongoose');
var UserSchema = mongoose.Schema(
  {
    name: { required: true, type: String },
    username: { required: true, type: String, unique: true },
    password: { required: true, type: String, select: false },
    upcomingInterviews: {
      type: [mongoose.SchemaTypes.ObjectId],
      ref: 'Interview',
    },
    pastInterviews: { type: [mongoose.SchemaTypes.ObjectId], ref: 'Interview' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
