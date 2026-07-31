# Accessibility Statement — source copy and setup

The published statement lives in Contentful at slug `/accessibility`, like every
other page on the site. This file is the **canonical source of the wording**.

Why both: the statement makes factual claims about how the site conforms and
what is still broken. Those claims have to track engineering reality, so the text
is reviewed here in git, and Contentful holds the published copy. If you edit the
statement in Contentful, update this file to match.

**One rule:** the *Conformance status* section and the *Known limitations* list
should not be reworded without a developer confirming they are still true.
Upgrading "partially conformant" to "fully conformant" is a legal claim, not a
copy edit. Everything else — contact details, review date, tone — is fair game.

---

## Contentful setup

Two entries, then publish both.

### 1. Section entry

Content type: **Text with Image Section** (`sectionTextWithImage`)

| Field | Value |
|---|---|
| Internal name | `Accessibility Statement` |
| Title | `Accessibility Statement` |
| Lead paragraph | The lead paragraph below |
| Body | The body copy below, as rich text |
| Image / Video URL / Optional link | leave empty |
| Background style | leave empty (defaults to the light background) |

### 2. Page entry

Content type: **Page** (`page`)

| Field | Value |
|---|---|
| Internal title | `Accessibility` |
| Slug | `/accessibility` |
| SEO title | `Accessibility Statement \| Holliston Pantry Shelf` |
| SEO description | `How the Holliston Pantry Shelf website supports accessibility, its WCAG 2.1 AA conformance status, known limitations, and how to report a problem.` |
| Sections | the section entry from step 1 |

### Two things the renderers do for you

- **The page has no Hero section, so the section title automatically becomes the
  page's `<h1>`.** That is intentional — do not add a hero, and do not add a
  heading to the body to act as the page title.
- **Use "Heading 3" for the headings inside the body.** The renderer re-levels
  them to `<h2>` so the outline is valid, while keeping the smaller size. You
  cannot break the heading order from the editor, but Heading 3 is the choice
  that also looks right.

### After publishing

The footer already links to `/accessibility`. That link ships in the code, so
**publish the Contentful entries before deploying**, or the link will 404.

---

## Lead paragraph

> The Holliston Pantry Shelf is committed to making this website usable by
> everyone in our community, including people with disabilities. Getting help
> with food should never depend on how you browse the web.

## Body copy

### Measures we take

- We treat WCAG 2.1 Level AA as the standard we are building toward.
- Accessibility is considered when we add or change parts of the site.
- We test with automated tools and by navigating the site using only a keyboard.
- We provide the contact routes below so people can tell us what we missed.

### Conformance status

The [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
define requirements for designers and developers to improve accessibility for
people with disabilities. It defines three levels of conformance: Level A, Level
AA, and Level AAA.

This website is **partially conformant with WCAG 2.1 Level AA**. "Partially
conformant" means that some parts of the content do not fully meet the standard.
The known gaps are listed below, and we are working through them.

### Known limitations

Despite our efforts, some limitations remain. Please contact us if you run into
something that is not on this list.

1. **Image descriptions.** Some images may have inaccurate or incomplete
   alternative text. We are reviewing every image in our content library.
2. **Text over photographs.** Headline text placed over a background photograph
   may not always meet minimum contrast, depending on the photograph used.
3. **Downloadable documents.** Some PDFs, including application forms and
   guidelines, predate this work and may not be readable by a screen reader.
   **We will supply any of this information in another format, including large
   print or paper, on request** — just ask.
4. **Embedded video.** Videos hosted on third-party platforms use those
   platforms' players, which we do not control. Captions depend on the original
   source.

### Tell us about a problem

We welcome your feedback on the accessibility of this website. If you cannot
reach something you need, please tell us:

- Email: [info@hollistonpantryshelf.org](mailto:info@hollistonpantryshelf.org)
- Phone: [(508) 429-5392](tel:+15084295392)

It helps if you can tell us the page you were on and what went wrong, but do not
worry if you cannot — contact us anyway and we will work it out. We aim to
respond within five business days.

### Technical specifications

Accessibility of this website relies on HTML, CSS, JavaScript, and WAI-ARIA, used
together with your browser and any assistive technology you have installed.

### How we assessed this site

The Holliston Pantry Shelf evaluated this website by self-evaluation. We used
automated testing against WCAG 2.1 Level A and AA, together with manual keyboard
navigation testing. We have not yet completed a full audit with screen readers
and other assistive technology, which is why the conformance status above says
partially conformant.

### Closing line

> This statement was last reviewed on July 31, 2026.

---

## The W3C "WCAG 2.1 AA" conformance badge

Deliberately **not** displayed, and it should stay that way until the conditions
below are met.

The badge is a formal, public declaration that *every* Level AA success criterion
is met across complete pages and complete processes. Passing automated checks does
not establish that — automated tooling covers roughly a third of the criteria, and
the limitations listed above are real and currently open. A conformance claim that
does not hold up is worse than no claim at all: it is the kind of thing cited in
ADA demand letters.

Display it only once all of the following are true:

1. The known limitations above are closed — in particular the image alt text
   review and the hero background-image contrast check.
2. A manual audit including screen-reader and assistive-technology testing has
   been completed across all pages, not just the ones covered by automation.
3. This statement is updated to say **fully conformant**, and the limitations
   section is revised accordingly.

Then add the badge to the end of the body copy, as an image with a link:

- Image URL: `https://www.w3.org/WAI/wcag21AA.svg`
- Alt text: `Level AA conforms to W3C WCAG 2.1`
- Links to: `https://www.w3.org/WAI/WCAG21/quickref/`

Worth knowing that many practitioners advise against the badge regardless, on the
grounds that a self-declaration invites scrutiny while providing no legal
protection. A specific, honest statement of what does and does not work — which is
what this document is — demonstrates good faith more effectively.
