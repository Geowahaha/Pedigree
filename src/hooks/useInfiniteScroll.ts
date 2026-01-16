import { useState, useEffect, useCallback } from 'react';

export const useInfiniteScroll = <T,>(
    items: T[],
    itemsPerPage = 20
) => {
    const [visibleItems, setVisibleItems] = useState<T[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        // Reset when items change
        setPage(1);
        loadItems(1);
    }, [items]);

    const loadItems = (pageNum: number) => {
        const start = 0;
        const end = pageNum * itemsPerPage;
        const newVisibleItems = items.slice(start, end);
        setVisibleItems(newVisibleItems);
        setHasMore(end < items.length);
    };

    const loadMore = useCallback(() => {
        if (!hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        loadItems(nextPage);
    }, [page, hasMore, items]);

    const reset = () => {
        setPage(1);
        loadItems(1);
    };

    return {
        visibleItems,
        loadMore,
        hasMore,
        reset,
        isLoading: false,
    };
};
