// import components
import ContactSection from "./ContactSection"
import HeroSection from "./HeroSection"
import TextWithImageSection from "./TextWithImageSection"
import IconGridSection from "./IconGridSection"
import NewsListSection from "./NewsListSection"
import NewsPostSection from "./NewsPostSection"
import DonationSection from "./DonationSection"
import VolunteerSection from "./VolunteerSection"
import OperationMittenSection from "./OperationMittenSection"

// Section Renderer Component (Unchanged logic, just renders components with classes)
// `titleTag` lets App promote the first section's title to <h1> on pages that
// have no hero section, so every page has exactly one level-one heading.
const SectionRenderer = ({ section, entryId, sitePhone, siteEmail, titleTag }) => {
  switch (section.contentType) {
    case 'sectionHero':
      return <HeroSection {...section} entryId={entryId} />
    case 'sectionTextWithImage':
      return <TextWithImageSection {...section} entryId={entryId} titleTag={titleTag} />
    case 'sectionIconGrid':
      return <IconGridSection {...section} entryId={entryId} titleTag={titleTag} />
    case 'sectionContact':
      return <ContactSection {...section} entryId={entryId} titleTag={titleTag} sitePhone={sitePhone} siteEmail={siteEmail} />
    case 'sectionNewsList':
      return <NewsListSection {...section} entryId={entryId} titleTag={titleTag} />
    case 'sectionNewsPost':
      return <NewsPostSection {...section} entryId={entryId} />
    case 'sectionDonation':
      return <DonationSection {...section} entryId={entryId} titleTag={titleTag} />
    case 'sectionVolunteer':
      return <VolunteerSection {...section} entryId={entryId} titleTag={titleTag} />
    case 'sectionOperationMitten':
      return <OperationMittenSection {...section} entryId={entryId} titleTag={titleTag} />
    default:
      console.warn(`Unknown section type: ${section.contentType}`)
      return <div className="container"><div style={{ margin: '2rem 0', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c' }}>Unsupported section type: {section.contentType}</div></div>
  }
};

export default SectionRenderer
