# Campaign guide (for Contentful editors)

Step-by-step guide to creating and running a paid campaign (Duck Drop, event
tickets). Built from `build.cjs` into `campaign-guide.html` and
`campaign-guide.pdf`, with screenshots in `screens/`.

```bash
node docs/campaign-guide/capture-website.mjs      # website, Stripe, email, sheet screenshots
node docs/campaign-guide/capture-contentful.mjs   # Contentful screens — opens Chrome, you log in once
node docs/campaign-guide/build.cjs                # writes the HTML + PDF
```

The screenshots use the `duck-drop-test` campaign on `/duck-drop-test`.
