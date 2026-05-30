// import components
import ContactSection from "./ContactSection"
import HeroSection from "./HeroSection"
import TextWithImageSection from "./TextWithImageSection"
import IconGridSection from "./IconGridSection"
import NewsListSection from "./NewsListSection"
import NewsPostSection from "./NewsPostSection"
import DonationSection from "./DonationSection"
import VolunteerSection from "./VolunteerSection"

// Section Renderer Component (Unchanged logic, just renders components with classes)
const SectionRenderer = ({ section, entryId, sitePhone, siteEmail }) => {
  switch (section.contentType) {
    case 'sectionHero':
      return <HeroSection {...section} entryId={entryId} />
    case 'sectionTextWithImage':
      return <TextWithImageSection {...section} entryId={entryId} />
    case 'sectionIconGrid':
      return <IconGridSection {...section} entryId={entryId} />
    case 'sectionContact':
      return <ContactSection {...section} entryId={entryId} sitePhone={sitePhone} siteEmail={siteEmail} />
    case 'sectionNewsList':
      return <NewsListSection {...section} entryId={entryId} />
    case 'sectionNewsPost':
      return <NewsPostSection {...section} entryId={entryId} />
    case 'sectionDonation':
      return <DonationSection {...section} entryId={entryId} />
    case 'sectionVolunteer':
      return <VolunteerSection {...section} entryId={entryId} />
    default:
      console.warn(`Unknown section type: ${section.contentType}`)
      return <div className="container"><div style={{ margin: '2rem 0', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c' }}>Unsupported section type: {section.contentType}</div></div>
  }
};

export default SectionRenderer
