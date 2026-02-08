export function createPageUrl(pageName: string) {
    const [rawPage, queryString = ''] = pageName.split('?');
    const params = new URLSearchParams(queryString);

    if (rawPage === 'JobForm') {
        const query = params.toString();
        return query ? `/jobs/new?${query}` : '/jobs/new';
    }

    if (rawPage === 'JobDetails') {
        const id = params.get('id');
        if (id) {
            params.delete('id');
            const remaining = params.toString();
            return `/jobs/${encodeURIComponent(id)}${remaining ? `?${remaining}` : ''}`;
        }
        const query = params.toString();
        return query ? `/jobs?${query}` : '/jobs';
    }

    if (rawPage === 'ClientForm') {
        const id = params.get('id');
        if (id) {
            params.delete('id');
            const remaining = params.toString();
            return `/clients/${encodeURIComponent(id)}${remaining ? `?${remaining}` : ''}`;
        }
        const query = params.toString();
        return query ? `/clients/new?${query}` : '/clients/new';
    }

    const basePath = rawPage.replace(/ /g, '-');
    return '/' + basePath + (queryString ? `?${queryString}` : '');
}
