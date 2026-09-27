/* ============================================================
   Mọt Sách — lớp dữ liệu dùng chung (localStorage)
   Được nạp bởi cả index.html và admin.html để 2 trang luôn
   đồng bộ cùng một nguồn dữ liệu sách.
   ============================================================ */

const BOOKS_KEY = 'motsach_books';
const UPDATED_KEY = 'motsach_last_updated';

// Giữ sẵn 2 quyển sách mẫu cho lần đầu chạy thử hệ thống.
const DEFAULT_BOOKS = [
  {
    id: 'seed-1',
    title: 'Những Con Đường Không Tên',
    author: 'Lâm Vũ Khanh',
    genre: 'Tiểu thuyết',
    copies: 12,
    status: 'available', // 'available' | 'out'
    rating: 5,
    cover: 'cv1'
  },
  {
    id: 'seed-2',
    title: 'Mật Mã Của Sương Sớm',
    author: 'Đỗ Thiên Ân',
    genre: 'Trinh thám',
    copies: 0,
    status: 'out',
    rating: 4,
    cover: 'cv2'
  }
];

function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function loadBooks(){
  try{
    const raw = localStorage.getItem(BOOKS_KEY);
    if(!raw){
      localStorage.setItem(BOOKS_KEY, JSON.stringify(DEFAULT_BOOKS));
      return [...DEFAULT_BOOKS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_BOOKS];
  }catch(e){
    console.error('Không thể đọc dữ liệu sách từ localStorage:', e);
    return [...DEFAULT_BOOKS];
  }
}

function saveBooks(books){
  try{
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
    localStorage.setItem(UPDATED_KEY, new Date().toISOString());
    return true;
  }catch(e){
    console.error('Không thể lưu dữ liệu sách vào localStorage:', e);
    return false;
  }
}

function addBook(book){
  const books = loadBooks();
  const newBook = { ...book, id: 'b' + Date.now() };
  books.unshift(newBook);
  saveBooks(books);
  return newBook;
}

function updateBook(id, updates){
  const books = loadBooks();
  const idx = books.findIndex(b => b.id === id);
  if(idx > -1){
    books[idx] = { ...books[idx], ...updates };
    saveBooks(books);
  }
  return books;
}

function deleteBook(id){
  const books = loadBooks().filter(b => b.id !== id);
  saveBooks(books);
  return books;
}

/* ============================================================
   Tài khoản & phân quyền (dùng chung cho index.html, admin.html)
   'msAccounts'     -> danh sách tài khoản đã đăng ký (login.html/register.html ghi)
   'msCurrentUser'  -> phiên đăng nhập hiện tại: { name, email, role }
   role: 'admin' (được sửa/thêm/xoá sách) | 'user' (chỉ xem)
   ============================================================ */

function getCurrentUser(){
  try{
    return JSON.parse(localStorage.getItem('msCurrentUser')) || null;
  }catch(e){
    return null;
  }
}

function isAdmin(){
  const user = getCurrentUser();
  return !!user && user.role === 'admin';
}

function logout(){
  localStorage.removeItem('msCurrentUser');
  localStorage.removeItem('msRemember');
}

// Danh sách tài khoản đã đăng ký (ghi bởi register.html / login.js seed admin).
function getAccounts(){
  try{
    const parsed = JSON.parse(localStorage.getItem('msAccounts'));
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    return [];
  }
}

function getLastUpdatedLabel(){
  const raw = localStorage.getItem(UPDATED_KEY);
  if(!raw) return 'Chưa có cập nhật';
  const d = new Date(raw);
  if(isNaN(d.getTime())) return 'Chưa có cập nhật';
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `Cập nhật lúc ${hh}:${mm}`;
}

/* ============================================================
   Mua sách để mở khoá xem mô tả
   'motsach_purchases' -> danh sách { email, bookId } đã mua
   Admin luôn được xem mô tả mà không cần mua.
   ============================================================ */

const PURCHASES_KEY = 'motsach_purchases';

function loadPurchases(){
  try{
    const raw = localStorage.getItem(PURCHASES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    return [];
  }
}

function savePurchases(list){
  try{
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(list));
  }catch(e){
    console.error('Không thể lưu thông tin mua sách:', e);
  }
}

// Sách đã được tài khoản hiện tại mua chưa? Admin luôn trả về true.
function hasPurchased(bookId){
  const user = getCurrentUser();
  if(!user) return false;
  if(user.role === 'admin') return true;
  return loadPurchases().some(p => p.email === user.email && p.bookId === bookId);
}

// Ghi nhận việc mua sách cho tài khoản hiện tại — đồng thời trừ 1 bản tồn kho.
// Trả về { success, reason } thay vì true/false để phía giao diện báo lỗi rõ ràng.
function purchaseBook(bookId){
  const user = getCurrentUser();
  if(!user) return { success:false, reason:'not-logged-in' };
  if(hasPurchased(bookId)) return { success:true, alreadyOwned:true };

  const books = loadBooks();
  const book = books.find(b => b.id === bookId);
  if(!book) return { success:false, reason:'not-found' };
  if(book.status !== 'available' || (Number(book.copies) || 0) <= 0){
    return { success:false, reason:'out-of-stock' };
  }

  const newCopies = Math.max(0, (Number(book.copies) || 0) - 1);
  updateBook(bookId, {
    copies: newCopies,
    status: newCopies > 0 ? 'available' : 'out'
  });

  const purchases = loadPurchases();
  purchases.push({ email: user.email, bookId, purchasedAt: new Date().toISOString() });
  savePurchases(purchases);
  return { success:true };
}

// Danh sách sách mà tài khoản hiện tại đã mua (mới nhất lên trước).
function getMyPurchasedBooks(){
  const user = getCurrentUser();
  if(!user) return [];
  const books = loadBooks();
  return loadPurchases()
    .filter(p => p.email === user.email)
    .slice()
    .reverse()
    .map(p => {
      const book = books.find(b => b.id === p.bookId);
      return book ? { ...book, purchasedAt: p.purchasedAt } : null;
    })
    .filter(Boolean);
}

// Định dạng ngày giờ mua hàng theo kiểu dd/mm/yyyy hh:mm (giờ địa phương).
function formatPurchaseDate(iso){
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '—';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Toàn bộ lịch sử mua hàng của mọi khách hàng, mới nhất lên trước.
// Ghép dữ liệu từ 3 nguồn: motsach_purchases (ai mua, mua lúc nào),
// msAccounts (tên khách hàng ứng với email) và motsach_books (tên sách đã mua).
function getAllPurchaseHistory(){
  const purchases = loadPurchases();
  const books = loadBooks();
  const accounts = getAccounts();

  return purchases
    .slice()
    .reverse()
    .map(p => {
      const book = books.find(b => b.id === p.bookId);
      const account = accounts.find(a => a.email === p.email);
      return {
        purchasedAt: p.purchasedAt,
        buyerName: account ? account.name : p.email,
        buyerEmail: p.email,
        bookTitle: book ? book.title : '(Sách đã bị xoá khỏi hệ thống)',
        bookAuthor: book ? book.author : '—',
        price: book ? book.price : null
      };
    });
}

function formatPrice(price){
  const num = Number(price) || 0;
  return num.toLocaleString('vi-VN') + 'đ';
}

// Sinh sẵn HTML cho 1 thẻ sách (dùng chung ở trang chủ và trang "Sách đã mua").
function renderBookCardHtml(b){
  const coverStyle = b.bannerImage
    ? ` style="background-image:linear-gradient(180deg, rgba(20,10,10,0) 40%, rgba(20,10,10,0.72) 100%), url('${b.bannerImage}')"`
    : "";
  const coverClass = b.bannerImage ? "has-image" : (b.cover || "cv1");
  return `
    <a class="book-card" href="book-detail.html?id=${encodeURIComponent(b.id)}">
      <div class="cover ${coverClass}"${coverStyle}><h3>${escapeHtml(b.title)}</h3></div>
      <div class="author">${escapeHtml(b.author)}</div>
      <div class="stars">${'★'.repeat(b.rating || 0)}${'☆'.repeat(5 - (b.rating || 0))}</div>
      <div class="meta-row" style="display:flex; align-items:center; justify-content:space-between;">
        <span class="badge ${b.status === 'available' ? 'badge-available' : 'badge-out'}">${b.status === 'available' ? 'Còn sách' : 'Hết sách'}</span>
        <span class="progress-label" style="font-family:var(--font-mono);">${formatPrice(b.price)}</span>
      </div>
    </a>
  `;
}