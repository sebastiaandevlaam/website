import ReactMarkdown from 'react-markdown';
import { trimMarkdown } from '@/utils/markdown';

// The "thank you" panel shown after any form submits. All three forms had their
// own copy of this markup.
//
// `className` lets a caller add page-specific framing (the donate page boxes it
// on a card); `children` is for extra content between the headline and body,
// such as the donation amount confirmation.
const SuccessCard = ({ headline, body, children, inspectorProps, className = '' }) => (
    <div className={`form-success ${className}`.trim()}>
        <div className="form-success-icon" aria-hidden="true">✓</div>
        <h2 {...(inspectorProps ? inspectorProps({ fieldId: 'successHeadline' }) : {})}>
            {headline}
        </h2>
        {children}
        {body && (
            <div
                className="markdown-content"
                {...(inspectorProps ? inspectorProps({ fieldId: 'successBody' }) : {})}
            >
                <ReactMarkdown>{trimMarkdown(body)}</ReactMarkdown>
            </div>
        )}
    </div>
);

export default SuccessCard;
