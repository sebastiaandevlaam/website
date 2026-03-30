import Icon from './Icon';

const NotFoundSection = () => (
    <section className="not-found-section bg-default">
        <div className="container not-found-container">
            <Icon name="Home" className="not-found-icon" />
            <h1 className="not-found-title">Page Not Found</h1>
            <p className="lead not-found-message">
                Sorry, we couldn't find the page you were looking for. It may have been moved or removed.
            </p>
            <a href="/" className="button primary-button">Back to Home</a>
        </div>
    </section>
);

export default NotFoundSection;
