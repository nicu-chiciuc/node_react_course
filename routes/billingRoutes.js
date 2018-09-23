const keys = require('../config/keys')
const stripe = require('stripe')(keys.stripeSecretKey)

module.exports = app => {
  app.post('/api/stripe', (req, res) => {
    console.log(req.body)
  })
}

// stripe.charges.create(
//   {
//     amount: 2000,
//     currency: 'usd',
//     source: 'tok_visa', // obtained with Stripe.js
//     description: 'Charge for jenny.rosen@example.com',
//   },
//   function(err, charge) {
//     // asynchronously called
//   }
// )
