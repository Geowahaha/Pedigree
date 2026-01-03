
import fs from 'fs';
import https from 'https';
import path from 'path';

const PAGE_ID = '1524899624269342';
const ACCESS_TOKEN = 'EAAWrnZBZBXfz4BQfRNT3eJFCs2brgOGwMCd9ZA5IchZCIC7XIzs9k8pqL4N0eN2EZB6U624GO7qszxz90K0eWEPnVaQpZA3EYsweuZAlk92tpBqbKflsWqF0Xk2ZBPvxgXtlGVPakYUwzaKMZCxUlMyrFLCDIbXxYKhVA4RbGlZARS29ltG4wrdGHCjifZAUI8NCi9xsrRXZBOJ8EvP9lch1ZCns50sGfoOyXpzZAyKTGV0GZCMoPF3lFZB3yqWZBXO2m';
const MAX_PHOTOS = 50; // Maximum number of photos to fetch
const DOWNLOAD_IMAGES = true; // Set to false if you don't want to download images
const IMAGE_DIR = './downloaded_images';

// Create image directory if it doesn't exist
if (DOWNLOAD_IMAGES && !fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

/**
 * Download image from URL and save to local filesystem
 */
function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(IMAGE_DIR, filename);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✓ Downloaded:  ${filename}`);
                resolve(filePath);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => { }); // Delete partial file
            reject(err);
        });
    });
}

/**
 * Fetch photos from Facebook Page with pagination support
 */
async function fetchPhotos(afterCursor = null, allPhotos = []) {
    try {
        let url = `https://graph.facebook.com/v19.0/${PAGE_ID}/photos?type=uploaded&fields=images,name,created_time&limit=25&access_token=${ACCESS_TOKEN}`;

        if (afterCursor) {
            url += `&after=${afterCursor}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            const err = await response.text();
            console.error('Error fetching Facebook data:', response.status, err);
            return allPhotos;
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            console.log(`Fetched ${data.data.length} photos (Total: ${allPhotos.length + data.data.length})`);

            // Process photos from current batch
            for (const item of data.data) {
                const photoData = {
                    id: item.id,
                    url: item.images[0].source,
                    caption: item.name || 'Thai Ridgeback',
                    created_time: item.created_time
                };

                // Download image if enabled
                if (DOWNLOAD_IMAGES) {
                    try {
                        const filename = `${item.id}.jpg`;
                        const localPath = await downloadImage(photoData.url, filename);
                        photoData.localPath = localPath;
                    } catch (downloadError) {
                        console.error(`✗ Failed to download ${item.id}:`, downloadError.message);
                    }
                }

                allPhotos.push(photoData);
            }

            // Check if we should fetch more
            const hasMore = data.paging && data.paging.next && data.paging.cursors;
            const shouldFetchMore = allPhotos.length < MAX_PHOTOS && hasMore;

            if (shouldFetchMore) {
                console.log('Fetching next page...\n');
                // Recursive call with pagination cursor
                return await fetchPhotos(data.paging.cursors.after, allPhotos);
            } else {
                // Save final results
                fs.writeFileSync('thai_ridgebacks.json', JSON.stringify(allPhotos, null, 2));
                console.log(`\n✓ Complete! Saved ${allPhotos.length} photos to thai_ridgebacks.json`);

                if (DOWNLOAD_IMAGES) {
                    const downloadedCount = allPhotos.filter(p => p.localPath).length;
                    console.log(`✓ Downloaded ${downloadedCount} images to ${IMAGE_DIR}`);
                }

                return allPhotos;
            }
        } else {
            console.log('No photos found or empty data.');
            if (allPhotos.length > 0) {
                fs.writeFileSync('thai_ridgebacks.json', JSON.stringify(allPhotos, null, 2));
                console.log(`Saved ${allPhotos.length} photos to thai_ridgebacks.json`);
            }
            return allPhotos;
        }

    } catch (error) {
        console.error('Exception:', error);
        // Save whatever we have so far
        if (allPhotos.length > 0) {
            fs.writeFileSync('thai_ridgebacks.json', JSON.stringify(allPhotos, null, 2));
            console.log(`Saved ${allPhotos.length} photos before error`);
        }
        return allPhotos;
    }
}

// Run the fetcher
console.log('Starting Facebook photo fetch...\n');
fetchPhotos();

