var mongoose = require('mongoose');
var InterviewSchema = mongoose.Schema(
  {
    owner: { type: mongoose.SchemaTypes.ObjectId, required: true },
    title: { required: true, type: String },
    candidateName: { required: true, type: String },
    interviewerName: { required: true, type: String },
    note: { type: String, default: '' },
    isEnded: { type: Boolean, default: false },
    endTime: { type: Date, default: 0 },
    candidateLink: { type: String, default: '' },
    interviewerLink: { type: String, default: '' },
    candidateConnection: { type: String, default: '' },
    interviewerConnection: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', InterviewSchema);
