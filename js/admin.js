// ===== Chặn truy cập: chỉ tài khoản admin mới được vào trang này =====
  (function requireAdmin(){
    const current = getCurrentUser();
    if(!current || current.role !== 'admin'){
      alert('Bạn cần đăng nhập bằng tài khoản quản trị để truy cập trang này.');
      window.location.href = 'login.html';
      return;
    }
    document.getElementById('adminNameLabel').textContent = 'Xin chào, ' + current.name;
  })();

  document.getElementById('logoutBtn').addEventListener('click', function(e){
    e.preventDefault();
    logout();
    window.location.href = 'login.html';
  });

  let editingId = null;
  let selectedCover = 'cv1';
  let selectedCoverImage = null; // base64 data URL của ảnh bìa riêng (nếu có)

  function selectSwatch(cover){
    selectedCover = cover;
    document.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cover === cover);
    });
  }

  // Đọc file ảnh người dùng chọn và chuyển thành base64 để lưu cùng sách
  // trong localStorage (không cần server lưu file riêng).
  function handleCoverImageSelect(e){
    const file = e.target.files && e.target.files[0];
    if(!file) return;

    if(!file.type.startsWith('image/')){
      alert('Vui lòng chọn một tệp hình ảnh hợp lệ.');
      e.target.value = '';
      return;
    }
    // Giới hạn nhẹ để tránh làm đầy localStorage (khoảng ~5MB mỗi domain).
    if(file.size > 1.5 * 1024 * 1024){
      alert('Ảnh quá lớn (tối đa 1.5MB). Vui lòng chọn ảnh nhỏ hơn.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(ev){
      selectedCoverImage = ev.target.result;
      showCoverImagePreview(selectedCoverImage);
    };
    reader.readAsDataURL(file);
  }

  function showCoverImagePreview(src){
    const wrap = document.getElementById('coverImagePreviewWrap');
    const img = document.getElementById('coverImagePreview');
    img.src = src;
    wrap.style.display = 'flex';
  }

  function clearCoverImage(){
    selectedCoverImage = null;
    document.getElementById('f-cover-image').value = '';
    document.getElementById('coverImagePreviewWrap').style.display = 'none';
    document.getElementById('coverImagePreview').src = '';
  }

  function openForm(mode, book){
    document.getElementById('bookFormPanel').classList.add('open');
    if(mode === 'edit' && book){
      document.getElementById('formTitle').textContent = 'Chỉnh sửa sách đang bán';
      document.getElementById('saveBtnLabel').textContent = 'Cập nhật sách';
      editingId = book.id;
      document.getElementById('f-title').value = book.title;
      document.getElementById('f-author').value = book.author;
      document.getElementById('f-genre').value = book.genre;
      document.getElementById('f-copies').value = book.copies;
      document.getElementById('f-price').value = book.price || 0;
      document.getElementById('f-status').value = book.status;
      document.getElementById('f-rating').value = book.rating;
      document.getElementById('f-description').value = book.description || '';
      selectSwatch(book.cover || 'cv1');
      if(book.bannerImage){
        selectedCoverImage = book.bannerImage;
        showCoverImagePreview(book.bannerImage);
      }else{
        clearCoverImage();
      }
    }else{
      document.getElementById('formTitle').textContent = 'Đăng bán sách mới';
      document.getElementById('saveBtnLabel').textContent = 'Đăng bán';
      editingId = null;
      document.getElementById('bookForm').reset();
      document.getElementById('f-copies').value = 1;
      selectSwatch('cv1');
      clearCoverImage();
    }
    document.getElementById('bookFormPanel').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function closeForm(){
    document.getElementById('bookFormPanel').classList.remove('open');
    editingId = null;
  }

  /* ============================================================
     Tìm & nhập sách từ Gutendex (API công khai của Project Gutenberg)
     https://gutendex.com — trả về sách, tác giả, chủ đề, ảnh bìa.
     ============================================================ */

  let lastGutendexResults = [];

  function toggleImportPanel(){
    document.getElementById('importPanel').classList.toggle('open');
  }

  function formatGutendexAuthor(book){
    if(!book.authors || book.authors.length === 0) return 'Không rõ tác giả';
    return book.authors.map(a => {
      if(a.name && a.name.includes(',')){
        const parts = a.name.split(',').map(s => s.trim());
        return parts[1] ? `${parts[1]} ${parts[0]}` : parts[0];
      }
      return a.name || 'Không rõ tác giả';
    }).join(', ');
  }

  function gutendexCoverUrl(book){
    return (book.formats && (book.formats['image/jpeg'] || book.formats['image/png'])) || null;
  }

  function gutendexCardHtml(book){
    const cover = gutendexCoverUrl(book);
    const author = formatGutendexAuthor(book);
    const subject = (book.subjects && book.subjects[0]) || 'Chưa phân loại';
    return `
      <div class="gutendex-card">
        ${cover
          ? `<img src="${cover}" alt="">`
          : `<div class="cover cv1" style="height:180px; border-radius:4px;"></div>`}
        <h4>${escapeHtml(book.title)}</h4>
        <div class="meta">${escapeHtml(author)}</div>
        <div class="meta">${escapeHtml(subject)}</div>
        <label style="font-family:var(--font-mono); font-size:11px; color:var(--muted-2);">Giá bán (đ)</label>
        <input type="number" min="0" step="1000" value="25000" data-price-for="${book.id}">
        <button type="button" class="btn btn-gold" style="padding:9px 14px; font-size:13px;" onclick="addFromGutendex(${book.id})">+ Thêm vào cửa hàng</button>
      </div>
    `;
  }

  async function searchGutendex(){
    const query = document.getElementById('gutendexQuery').value.trim();
    const status = document.getElementById('gutendexStatus');
    const results = document.getElementById('gutendexResults');

    if(!query){
      status.textContent = 'Vui lòng nhập từ khoá tìm kiếm.';
      return;
    }

    status.textContent = 'Đang tìm kiếm... (máy chủ Gutendex miễn phí có thể mất vài giây)';
    results.innerHTML = '';

    // Gutendex là dịch vụ miễn phí, thỉnh thoảng phản hồi chậm/time-out.
    // Đặt giới hạn 15s để không bị treo vô thời hạn, và báo lỗi rõ ràng hơn.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try{
      const res = await fetch(
        'https://gutendex.com/books/?search=' + encodeURIComponent(query),
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if(!res.ok){
        status.innerHTML = `Gutendex trả về lỗi (mã ${res.status}). <button type="button" class="icon-btn" onclick="searchGutendex()">Thử lại</button>`;
        return;
      }

      const data = await res.json();

      if(!data.results || data.results.length === 0){
        status.textContent = 'Không tìm thấy sách nào phù hợp.';
        lastGutendexResults = [];
        return;
      }

      lastGutendexResults = data.results;
      status.textContent = `Tìm thấy ${data.count} kết quả — hiển thị ${data.results.length} sách đầu tiên.`;
      results.innerHTML = data.results.map(gutendexCardHtml).join('');
    }catch(err){
      clearTimeout(timeoutId);
      console.error('Lỗi khi gọi Gutendex API:', err);
      const isTimeout = err.name === 'AbortError';
      status.innerHTML = isTimeout
        ? `Máy chủ Gutendex phản hồi quá chậm (quá 15 giây). <button type="button" class="icon-btn" onclick="searchGutendex()">Thử lại</button>`
        : `Không thể kết nối tới Gutendex — có thể do mạng hoặc máy chủ đang bận. <button type="button" class="icon-btn" onclick="searchGutendex()">Thử lại</button>`;
    }
  }

  function addFromGutendex(gutendexId){
    const book = lastGutendexResults.find(b => b.id === gutendexId);
    if(!book) return;

    const priceInput = document.querySelector(`input[data-price-for="${gutendexId}"]`);
    const price = priceInput ? (parseInt(priceInput.value, 10) || 0) : 25000;
    const cover = gutendexCoverUrl(book);
    const author = formatGutendexAuthor(book);
    const subject = (book.subjects && book.subjects[0]) || 'Chưa phân loại';
    const summary = (book.summaries && book.summaries[0]) || '';
    const description = summary
      ? summary
      : `Nhập từ Gutendex (Project Gutenberg). Chủ đề: ${subject}.`;

    addBook({
      title: book.title,
      author: author,
      genre: subject.length > 40 ? subject.slice(0, 40) + '…' : subject,
      copies: 5,
      price: price,
      status: 'available',
      rating: 5,
      description: description,
      cover: 'cv1',
      bannerImage: cover
    });

    alert(`Đã thêm "${book.title}" vào cửa hàng!`);
    renderTable();
  }

  function editBook(id){
    const book = loadBooks().find(b => b.id === id);
    if(book) openForm('edit', book);
  }

  function removeBook(id){
    const book = loadBooks().find(b => b.id === id);
    const name = book ? `"${book.title}"` : 'cuốn sách này';
    if(confirm(`Bạn có chắc muốn xoá ${name} khỏi hệ thống không?`)){
      deleteBook(id);
      renderTable();
      alert('Đã xoá sách khỏi hệ thống.');
    }
  }

  function renderTable(){
    const books = loadBooks();
    const tbody = document.getElementById('bookTableBody');
    const tableWrap = document.getElementById('tableWrap');
    const empty = document.getElementById('emptyState');

    document.getElementById('totalCount').textContent = books.length;

    if(books.length === 0){
      tableWrap.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    tableWrap.style.display = 'block';
    empty.style.display = 'none';

    tbody.innerHTML = books.map(b => `
      <tr>
        <td>${b.bannerImage
          ? `<img src="${b.bannerImage}" alt="" style="width:26px; height:36px; object-fit:cover; border-radius:4px; box-shadow:0 3px 8px rgba(0,0,0,0.2);">`
          : `<span class="swatch-dot ${b.cover || 'cv1'}"></span>`}</td>
        <td class="cell-title">${escapeHtml(b.title)}</td>
        <td>${escapeHtml(b.author)}</td>
        <td>${escapeHtml(b.genre)}</td>
        <td>${b.copies}</td>
        <td>${formatPrice(b.price)}</td>
        <td><span class="badge ${b.status === 'available' ? 'badge-available' : 'badge-out'}">${b.status === 'available' ? 'Còn sách' : 'Hết sách'}</span></td>
        <td class="stars-cell">${'★'.repeat(b.rating || 0)}${'☆'.repeat(5 - (b.rating || 0))}</td>
        <td class="actions-cell">
          <button class="icon-btn" onclick="editBook('${b.id}')">Sửa</button>
          <button class="icon-btn danger" onclick="removeBook('${b.id}')">Xóa</button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('bookForm').addEventListener('submit', function(e){
    e.preventDefault();
    const data = {
      title: document.getElementById('f-title').value.trim(),
      author: document.getElementById('f-author').value.trim(),
      genre: document.getElementById('f-genre').value,
      copies: parseInt(document.getElementById('f-copies').value, 10) || 0,
      price: parseInt(document.getElementById('f-price').value, 10) || 0,
      status: document.getElementById('f-status').value,
      rating: parseInt(document.getElementById('f-rating').value, 10),
      description: document.getElementById('f-description').value.trim(),
      cover: selectedCover,
      bannerImage: selectedCoverImage || null
    };
    if(!data.title || !data.author) return;

    if(editingId){
      updateBook(editingId, data);
      alert('Đã cập nhật sách thành công!');
    }else{
      addBook(data);
      alert('Đã thêm sách thành công!');
    }
    closeForm();
    clearCoverImage();
    renderTable();
  });

  // Hiển thị lịch sử mua hàng của toàn bộ khách hàng: thời gian mua,
  // tên/email khách hàng và sách đã mua (dữ liệu ghép từ books.js -> getAllPurchaseHistory()).
  function renderPurchaseHistory(){
    const history = getAllPurchaseHistory();
    const tbody = document.getElementById('purchaseTableBody');
    const tableWrap = document.getElementById('purchaseTableWrap');
    const empty = document.getElementById('purchaseEmptyState');

    document.getElementById('totalPurchases').textContent = history.length;

    if(history.length === 0){
      tableWrap.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    tableWrap.style.display = 'block';
    empty.style.display = 'none';

    tbody.innerHTML = history.map(h => `
      <tr>
        <td>${formatPurchaseDate(h.purchasedAt)}</td>
        <td class="cell-title">${escapeHtml(h.buyerName)}</td>
        <td>${escapeHtml(h.buyerEmail)}</td>
        <td>${escapeHtml(h.bookTitle)}</td>
        <td>${escapeHtml(h.bookAuthor)}</td>
        <td>${h.price != null ? formatPrice(h.price) : '—'}</td>
      </tr>
    `).join('');
  }

  window.addEventListener('load', function(){
    renderTable();
    renderPurchaseHistory();
  });

  document.getElementById('gutendexSearchBtn').addEventListener('click', searchGutendex);
  document.getElementById('gutendexQuery').addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      e.preventDefault();
      searchGutendex();
    }
  });