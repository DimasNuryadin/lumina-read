import Dexie, { type Table } from 'dexie';
import type { Book, Bookmark } from '@/types/book';

export class LuminaDatabase extends Dexie {
  books!: Table<Book, string>;
  bookmarks!: Table<Bookmark, string>;

  constructor() {
    super('LuminaReadDB');
    this.version(1).stores({
      books: 'id, title, author, format, readingProgress, lastReadAt, createdAt',
      bookmarks: 'id, bookId, location, createdAt',
    });
  }
}

// Singleton pattern for client-side usage
export const db = new LuminaDatabase();

export async function getAllBooks(): Promise<Book[]> {
  try {
    return await db.books.orderBy('lastReadAt').reverse().toArray();
  } catch (error) {
    console.error('Failed to get books from IndexedDB:', error);
    return [];
  }
}

export async function getBookById(id: string): Promise<Book | undefined> {
  try {
    return await db.books.get(id);
  } catch (error) {
    console.error(`Failed to get book ${id}:`, error);
    return undefined;
  }
}

export async function saveBook(book: Book): Promise<string> {
  await db.books.put(book);
  return book.id;
}

export async function updateBookProgress(
  id: string,
  progress: number,
  location: string | number
): Promise<void> {
  await db.books.update(id, {
    readingProgress: Math.min(100, Math.max(0, Math.round(progress))),
    currentLocation: location,
    lastReadAt: Date.now(),
  });
}

export async function deleteBook(id: string): Promise<void> {
  await db.transaction('rw', db.books, db.bookmarks, async () => {
    await db.bookmarks.where('bookId').equals(id).delete();
    await db.books.delete(id);
  });
}

export async function getBookmarksByBookId(bookId: string): Promise<Bookmark[]> {
  try {
    return await db.bookmarks.where('bookId').equals(bookId).reverse().sortBy('createdAt');
  } catch (error) {
    console.error(`Failed to get bookmarks for ${bookId}:`, error);
    return [];
  }
}

export async function addBookmark(bookmark: Bookmark): Promise<string> {
  await db.bookmarks.put(bookmark);
  return bookmark.id;
}

export async function removeBookmark(id: string): Promise<void> {
  await db.bookmarks.delete(id);
}
