import { useState, useRef, useEffect, useMemo } from 'react';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import Icon from './Icon';

const ITEMS_PER_PAGE = 10;

const formatDate = (publishDate) =>
    publishDate
        ? new Date(publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

const monthKey = (publishDate) => {
    const d = new Date(publishDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getPageNumbers = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
};

const NewsPost = ({ post }) => {
    const { title: postTitle, slug, summary, publishDate, featuredImage } = post?.fields || {};
    const formattedDate = formatDate(publishDate);
    const inspectorProps = useContentfulInspectorMode({ entryId: post?.sys?.id });

    const imageUrl = featuredImage?.fields?.file?.url;
    const fullImageUrl = imageUrl?.startsWith('//') ? `https:${imageUrl}` : imageUrl;

    return (
        <article className="news-list-item">
            {fullImageUrl && (
                <a href={`/news/${slug}`} className="news-list-thumbnail" aria-hidden="true" tabIndex="-1" {...inspectorProps({ fieldId: 'featuredImage' })}>
                    <img src={fullImageUrl} alt="" />
                </a>
            )}
            <div className="news-list-content">
                {formattedDate && (
                    <time className="news-date" dateTime={publishDate} {...inspectorProps({ fieldId: 'publishDate' })}>
                        {formattedDate}
                    </time>
                )}
                <h3 className="news-item-title" {...inspectorProps({ fieldId: 'title' })}>
                    <a href={`/news/${slug}`}>{postTitle}</a>
                </h3>
                {summary && <p className="news-summary" {...inspectorProps({ fieldId: 'summary' })}>{summary}</p>}
                <a href={`/news/${slug}`} className="link-subtle news-read-more">
                    Read more <Icon name="ArrowRight" />
                </a>
            </div>
        </article>
    );
};

const NewsListSection = ({ title, leadParagraph, posts, displayLimit, displayStyle, backgroundStyle, entryId }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedMonth, setSelectedMonth] = useState('');
    const topRef = useRef(null);

    const bgClass = backgroundStyle === "Beige Background" ? "bg-beige" : "bg-default";
    const isGrid = displayStyle?.toLowerCase() === "grid";
    const inspectorProps = useContentfulInspectorMode({ entryId });
    const pageSize = displayLimit > 0 ? displayLimit : ITEMS_PER_PAGE;

    const allPosts = useMemo(
        () => isGrid ? (posts || []).slice(0, 3) : (posts || []),
        [posts, isGrid]
    );

    // Build sorted list of unique month/year options from all posts
    const monthOptions = useMemo(() => {
        const seen = new Set();
        const options = [];
        for (const post of (posts || [])) {
            const date = post?.fields?.publishDate;
            if (!date) continue;
            const key = monthKey(date);
            if (!seen.has(key)) {
                seen.add(key);
                options.push({
                    key,
                    label: new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
                });
            }
        }
        return options;
    }, [posts]);

    const filteredPosts = useMemo(() => {
        if (!selectedMonth) return allPosts;
        return allPosts.filter(post => {
            const date = post?.fields?.publishDate;
            return date && monthKey(date) === selectedMonth;
        });
    }, [allPosts, selectedMonth]);

    const totalPages = Math.ceil(filteredPosts.length / pageSize);
    const showPagination = !isGrid && totalPages > 1;
    const pagedPosts = isGrid
        ? filteredPosts
        : filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const goToPage = (page) => {
        setCurrentPage(page);
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleMonthChange = (e) => {
        setSelectedMonth(e.target.value);
        setCurrentPage(1);
    };

    // Reset page and filter if posts change (e.g. live preview)
    useEffect(() => {
        setCurrentPage(1);
        setSelectedMonth('');
    }, [posts]);

    return (
        <section className={`news-list-section ${bgClass}`} id="news">
            <div className="container">
                <h2 ref={topRef} {...inspectorProps({ fieldId: 'title' })}>{title}</h2>
                {leadParagraph && (
                    <p className="lead-paragraph" {...inspectorProps({ fieldId: 'leadParagraph' })}>
                        {leadParagraph}
                    </p>
                )}

                {!isGrid && monthOptions.length > 1 && (
                    <div className="news-filter">
                        <label htmlFor="news-month-filter" className="news-filter-label">
                            Filter by month:
                        </label>
                        <select
                            id="news-month-filter"
                            className="news-filter-select"
                            value={selectedMonth}
                            onChange={handleMonthChange}
                        >
                            <option value="">All months</option>
                            {monthOptions.map(({ key, label }) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        {selectedMonth && (
                            <button className="news-filter-clear" onClick={() => { setSelectedMonth(''); setCurrentPage(1); }}>
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {pagedPosts.length > 0 && isGrid ? (
                    <div className="news-grid" {...inspectorProps({ fieldId: 'posts' })}>
                        {pagedPosts.map(post => {
                            const { title: postTitle, slug, summary, publishDate, featuredImage } = post?.fields || {};
                            const formattedDate = formatDate(publishDate);
                            const imageUrl = featuredImage?.fields?.file?.url;
                            const imageAlt = featuredImage?.fields?.description || featuredImage?.fields?.title || postTitle || '';
                            const fullImageUrl = imageUrl?.startsWith('//') ? `https:${imageUrl}` : imageUrl;
                            return (
                                <article key={post.sys.id} className="card news-grid-card">
                                    {fullImageUrl && (
                                        <a href={`/news/${slug}`} className="news-grid-thumbnail">
                                            <img src={fullImageUrl} alt={imageAlt} loading="lazy" />
                                        </a>
                                    )}
                                    <div className="news-grid-content">
                                        {formattedDate && (
                                            <time className="news-date" dateTime={publishDate}>{formattedDate}</time>
                                        )}
                                        <h3 className="news-item-title">
                                            <a href={`/news/${slug}`}>{postTitle}</a>
                                        </h3>
                                        {summary && <p className="news-summary">{summary}</p>}
                                        <a href={`/news/${slug}`} className="link-subtle news-read-more">
                                            Read more <Icon name="ArrowRight" />
                                        </a>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : pagedPosts.length > 0 ? (
                    <div className="news-list" {...inspectorProps({ fieldId: 'posts' })}>
                        {pagedPosts.map(post => (
                            <NewsPost key={post.sys.id} post={post} />
                        ))}
                    </div>
                ) : (
                    <p className="news-no-results">No articles found for the selected month.</p>
                )}

                {showPagination && (
                    <nav className="news-pagination" aria-label="News pages">
                        <button
                            className="pagination-btn pagination-prev"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            aria-label="Previous page"
                        >
                            <Icon name="ArrowRight" /> Prev
                        </button>

                        <ul className="pagination-pages">
                            {getPageNumbers(currentPage, totalPages).map((page, i) =>
                                page === '...' ? (
                                    <li key={`ellipsis-${i}`} className="pagination-ellipsis" aria-hidden="true">…</li>
                                ) : (
                                    <li key={page}>
                                        <button
                                            className={`pagination-btn pagination-page ${page === currentPage ? 'active' : ''}`}
                                            onClick={() => goToPage(page)}
                                            aria-label={`Page ${page}`}
                                            aria-current={page === currentPage ? 'page' : undefined}
                                        >
                                            {page}
                                        </button>
                                    </li>
                                )
                            )}
                        </ul>

                        <button
                            className="pagination-btn pagination-next"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                        >
                            Next <Icon name="ArrowRight" />
                        </button>
                    </nav>
                )}
            </div>
        </section>
    );
};

export default NewsListSection;
