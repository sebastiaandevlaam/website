import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ReactMarkdown from 'react-markdown'
import Icon from "./Icon";
import ButtonLink from "./ButtonLink";

const CardComponent = ({ icon, title, description, optionalButtonlink, entryId }) => {
    const cardClass = icon ? "card support-card" : "card";
    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <div className={cardClass}>
            {icon && <Icon name={icon} className="card-icon" />}
            <h3 {...inspectorProps({ fieldId: 'title' })}>{title}</h3>
            <div className="description body-text markdown-content" {...inspectorProps({ fieldId: 'description' })}>
                {description && (
                    <ReactMarkdown>
                        {description}
                    </ReactMarkdown>
                )}
            </div>
            {optionalButtonlink && <div className="card-link"><ButtonLink {...optionalButtonlink.fields} entryId={optionalButtonlink.sys.id} /></div>}
        </div>
    );
};

export default CardComponent
