import { deleteRow } from '@/lib/mutation-route';

/** Deletes a site with its posts and ideas (cascade). */
export const POST = deleteRow('cms_sites', '/cms');
