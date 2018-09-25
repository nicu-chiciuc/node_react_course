const mongoose = require('mongoose')
const Path = require('path-parser').default
const _ = require('lodash')
const { URL } = require('url')

const requireLogin = require('../middlewares/requireLogin')
const requireCredit = require('../middlewares/requireCredits')
const Mailer = require('../services/Mailer')
const surveyTemplate = require('../services/emailTemplates/surveyTemplate')

const Survey = mongoose.model('surveys')

module.exports = app => {
  app.get('/api/surveys', requireLogin, async (req, res) => {
    const surveys = await Survey.find({ _user: req.user.id }).select({
      recipients: false,
    })

    res.send(surveys)
  })

  app.get('/api/surveys/:surveyId/:choice', (req, res) => {
    res.send('Thanks for voting!')
  })

  app.post('/api/surveys/webhooks', (req, res) => {
    const p = new Path('/api/surveys/:surveyId/:choice')

    // _.chain(req.body)
    const v1 = _.map(req.body, ({ email, url }) => {
      const match = p.test(new URL(url).pathname)

      if (match) return { email, ...match }
    })
    const v2 = _.compact(v1)
    const v3 = _.uniqBy(v2, 'email', 'surveyId')
    _.each(v3, ({ surveyId, email, choice }) => {
      Survey.updateOne(
        {
          _id: surveyId,
          recipients: {
            $elemMatch: { email, responded: false },
          },
        },
        {
          $inc: { [choice]: 1 },
          $set: { 'recipients.$.responded': true },
          lastResponded: new Date(),
        }
      ).exec()
    })

    res.send({})
  })

  app.post('/api/surveys', requireLogin, requireCredit, async (req, res) => {
    const { title, subject, body, recipients } = req.body

    const survey = new Survey({
      title,
      subject,
      body,
      recipients: recipients.split(',').map(email => ({ email: email.trim() })),

      _user: req.user.id,

      dateSent: Date.now(),
    })

    //send mail
    const mailer = new Mailer(survey, surveyTemplate(survey))
    try {
      await mailer.send()

      await survey.save()
      req.user.credits -= 1
      const user = await req.user.save()

      res.send(user)
    } catch (err) {
      res.status(422)
    }
  })
}
