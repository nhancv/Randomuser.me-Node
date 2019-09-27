const fs       = require('fs');
const util     = require('util');
const express  = require('express');
const store    = require('../store');
const router   = express.Router();

const settings = require('../settings');

const readdir = util.promisify(fs.readdir);
const stripe = require("stripe")(
  settings.stripePrivateKey
);

const titles = {
  changelog: 'Change Log',
  copyright: 'Copyright',
  documentation: 'Documentation',
  donate: 'Donate',
  index: 'Home',
  photos: 'Photos',
  photoshop: 'Photoshop Extension',
  sketch: 'Sketch Extension',
  stats: 'Statistics'
};

(async () => {
  let views = await readdir('.viewsMin/pages');

  router.get('/', (req, res, next) => {
    res.render('pages/index', {title: 'Home'});
  });
  
  router.get('/:page?', (req, res, next) => {
    const page = req.params.page;
  
    if (page === 'index') {
      res.redirect(301, '/');
    } else if (views.indexOf(page + '.ejs') !== -1) {
      res.render('pages/' + page, {socket: ':' + settings.socket, title: titles[page], stripePublishKey: settings.stripePublishKey, stats: store.get('stats')['30'].total});
    } else {
      next();
    }
  });
  
  router.post('/donate', (req, res, next) => {
    let data;
    try {
      data = JSON.parse(req.body.data);
      stripe.charges.create({
        amount: data.token.price,
        currency: "usd",
        source: data.token.id, // obtained with Stripe.js
        description: `Donation from ${data.token.email} - ${data.comment}`
      }, (err, charge) => {
        if (process.env.spec === "true") return res.sendStatus(200);
        if (err) return res.sendStatus(400);
        else return res.sendStatus(200);
      });
    } catch (e) {
      return res.sendStatus(400);
    }
  });
  
  // Backwards compatibility with old versions of the PS extension
  router.all('/download/version.php', (req, res, next) => {
    res.json({"version": "3.0.1"});
  });
})();

module.exports = router;