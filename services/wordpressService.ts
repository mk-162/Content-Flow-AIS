/**
 * WordPress Export Service
 * 
 * Exports posts to WordPress via REST API.
 * Uses Application Passwords for authentication.
 */

import { Post } from '../types';
import { Timestamp } from 'firebase/firestore';

export interface WordPressConfig {
    siteUrl: string;
    username: string;
    appPassword: string;
    defaultStatus: 'publish' | 'draft' | 'pending';
    defaultAuthor?: number;
}

export interface WordPressPostResponse {
    id: number;
    link: string;
    status: string;
    title: { rendered: string };
}

/**
 * Test connection to WordPress API
 */
export const testWordPressConnection = async (config: WordPressConfig): Promise<{ success: boolean; message: string }> => {
    try {
        const url = `${config.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(`${config.username}:${config.appPassword}`),
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const user = await response.json();
            return {
                success: true,
                message: `Connected as ${user.name || user.slug}`
            };
        } else if (response.status === 401) {
            return { success: false, message: 'Invalid credentials. Check username and application password.' };
        } else {
            return { success: false, message: `Connection failed: ${response.status} ${response.statusText}` };
        }
    } catch (error: any) {
        return {
            success: false,
            message: `Connection error: ${error.message || 'Network error'}`
        };
    }
};

/**
 * Export a single post to WordPress
 */
export const exportToWordPress = async (
    post: Post,
    config: WordPressConfig
): Promise<{ success: boolean; wordpressId?: number; link?: string; error?: string }> => {
    try {
        const url = `${config.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

        // Build WordPress post payload
        const wpPost: Record<string, any> = {
            title: post.title,
            content: post.content || '',
            excerpt: post.teaser || '',
            slug: post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            status: config.defaultStatus,
        };

        // Add author if specified
        if (config.defaultAuthor) {
            wpPost.author = config.defaultAuthor;
        }

        console.log('[WordPress] Exporting post:', post.title);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${config.username}:${config.appPassword}`),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(wpPost),
        });

        if (response.ok) {
            const result: WordPressPostResponse = await response.json();
            console.log('[WordPress] Post created:', result.id);
            return {
                success: true,
                wordpressId: result.id,
                link: result.link
            };
        } else {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.message || `${response.status} ${response.statusText}`;
            console.error('[WordPress] Export failed:', message);
            return { success: false, error: message };
        }
    } catch (error: any) {
        console.error('[WordPress] Export error:', error);
        return {
            success: false,
            error: error.message || 'Network error during export'
        };
    }
};

/**
 * Bulk export multiple posts to WordPress
 */
export const bulkExportToWordPress = async (
    posts: Post[],
    config: WordPressConfig,
    onProgress?: (completed: number, total: number) => void
): Promise<{
    successful: { post: Post; wordpressId: number }[];
    failed: { post: Post; error: string }[];
}> => {
    const successful: { post: Post; wordpressId: number }[] = [];
    const failed: { post: Post; error: string }[] = [];

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const result = await exportToWordPress(post, config);

        if (result.success && result.wordpressId) {
            successful.push({ post, wordpressId: result.wordpressId });
        } else {
            failed.push({ post, error: result.error || 'Unknown error' });
        }

        onProgress?.(i + 1, posts.length);

        // Small delay to avoid rate limiting
        if (i < posts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return { successful, failed };
};
