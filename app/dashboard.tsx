"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight, Banknote, Boxes, ChartNoAxesCombined,
  Check, CheckCircle2, CircleDollarSign, Clock3, LoaderCircle, LogOut,
  Menu, Minus, Package, Plus, Printer, Search, ShoppingBag, ShoppingCart, Sparkles,
  Tag, Trash2, TrendingUp, UserRound, Users, X,
} from "lucide-react";
import { api, dateToday, rupiah, type Member, type Product, type User } from "@/lib/client";

type Section = "home" | "pos" | "reports" | "menu" | "members" | "users";
type Sale = {
  id: number;
  invoice: string;
  total: number;
  discount: number;
  subtotal?: number;
  paid?: number;
  changeAmount?: number;
  createdAt: string;
  cashierName?: string;
  memberName?: string | null;
  itemCount: number;
};
type Report = {
  summary: { transactionCount: number; revenue: number; discounts: number };
  chart: Array<{ day?: number; hour?: number; transactions: number; revenue: number }>;
  sales: Sale[];
  period: "day" | "month";
  date: string;
};
type Staff = { id: number; name: string; username: string; role: "admin" | "cashier"; createdAt: string };
type CartLine = { product: Product; quantity: number };
type CompletedSale = {
  invoice: string;
  createdAt: string;
  cashierName: string;
  memberName: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  changeAmount: number;
  items: Array<{ name: string; quantity: number; price: number; lineTotal: number }>;
};
type ModalType = "product" | "member" | "user" | null;

const navItems: Array<{ id: Section; label: string; icon: typeof Menu; admin?: boolean }> = [
  { id: "home", label: "Ringkasan", icon: ChartNoAxesCombined },
  { id: "pos", label: "Kasir", icon: ShoppingCart },
  { id: "reports", label: "Rekap penjualan", icon: TrendingUp },
  { id: "menu", label: "Menu & stok", icon: Package, admin: true },
  { id: "members", label: "Member", icon: Users, admin: true },
  { id: "users", label: "Pengguna", icon: UserRound, admin: true },
];

const productEmojis: Record<string, string> = {
  roti: "🥐", pastry: "🥨", minuman: "☕", kue: "🍰", snack: "🍪",
};

function productEmoji(category: string) {
  return Object.entries(productEmojis).find(([key]) => category.toLowerCase().includes(key))?.[1] ?? "🍞";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const isAdmin = user.role === "admin";
  const [section, setSection] = useState<Section>("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [reportDate, setReportDate] = useState(dateToday());
  const [period, setPeriod] = useState<"day" | "month">("day");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [memberId, setMemberId] = useState("");
  const [paid, setPaid] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadProducts = useCallback(async () => {
    const data = await api<{ products: Product[] }>("/api/products");
    setProducts(data.products);
  }, []);
  const loadMembers = useCallback(async () => {
    const data = await api<{ members: Member[] }>("/api/members");
    setMembers(data.members);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadPage() {
      setLoading(true);
      try {
        if (section === "home") {
          const [reportData, salesData, productData] = await Promise.all([
            api<Report>(`/api/reports?period=day&date=${dateToday()}`),
            api<{ sales: Sale[] }>(`/api/sales?date=${dateToday()}`),
            api<{ products: Product[] }>("/api/products"),
          ]);
          if (alive) { setReport(reportData); setSales(salesData.sales); setProductCount(productData.products.length); }
        } else if (section === "pos") {
          const [productData, memberData] = await Promise.all([
            api<{ products: Product[] }>("/api/products"),
            api<{ members: Member[] }>("/api/members"),
          ]);
          if (alive) { setProducts(productData.products); setMembers(memberData.members); }
        } else if (section === "menu") {
          const data = await api<{ products: Product[] }>("/api/products");
          if (alive) setProducts(data.products);
        } else if (section === "members") {
          const data = await api<{ members: Member[] }>("/api/members");
          if (alive) setMembers(data.members);
        } else if (section === "users") {
          const data = await api<{ users: Staff[] }>("/api/users");
          if (alive) setStaff(data.users);
        } else if (section === "reports") {
          const data = await api<Report>(`/api/reports?period=${period}&date=${reportDate}`);
          if (alive) setReport(data);
        }
      } catch (error) {
        if (alive) notify(error instanceof Error ? error.message : "Gagal memuat data.", true);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadPage();
    return () => { alive = false; };
  }, [section, reportDate, period, notify]);

  const categories = useMemo(() => ["Semua", ...new Set(products.map((product) => product.category))], [products]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "Semua" || product.category === category;
    return matchesQuery && matchesCategory;
  }), [products, query, category]);
  const chosenMember = members.find((member) => String(member.id) === memberId);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const discount = chosenMember ? Math.round(subtotal * Number(chosenMember.discountPercent)) / 100 : 0;
  const total = subtotal - discount;
  const pageTitle = navItems.find((item) => item.id === section)?.label ?? "Ringkasan";

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return current;
        return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      }
      if (product.stock < 1) return current;
      return [...current, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: number, amount: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.product.id !== productId) return [line];
      const quantity = line.quantity + amount;
      if (quantity < 1) return [];
      if (quantity > line.product.stock) return [line];
      return [{ ...line, quantity }];
    }));
  }

  async function checkout() {
    if (!cart.length) return;
    setBusy(true);
    try {
      const purchase = {
        items: cart.map((line) => ({ ...line })),
        subtotal,
        discount,
        total,
        paid: Number(paid),
        memberName: chosenMember?.name ?? null,
      };
      const result = await api<{ sale: { invoice: string; total: number; changeAmount: number } }>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          memberId: memberId || null,
          paid: Number(paid),
        }),
      });
      setCompletedSale({
        invoice: result.sale.invoice,
        createdAt: new Date().toISOString(),
        cashierName: user.name,
        memberName: purchase.memberName,
        subtotal: purchase.subtotal,
        discount: purchase.discount,
        total: result.sale.total,
        paid: purchase.paid,
        changeAmount: result.sale.changeAmount,
        items: purchase.items.map(({ product, quantity }) => ({
          name: product.name,
          quantity,
          price: product.price,
          lineTotal: product.price * quantity,
        })),
      });
      setCart([]);
      setMemberId("");
      setPaid("");
      setMobileCartOpen(false);
      try {
        await loadProducts();
      } catch (error) {
        notify(error instanceof Error ? `Pembelian berhasil, tetapi stok belum dapat dimuat: ${error.message}` : "Pembelian berhasil, tetapi stok belum dapat dimuat.", true);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Transaksi gagal.", true);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      onLogout();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Tidak dapat keluar.", true);
    }
  }

  async function saveModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (modal === "product") {
        const body = { ...values, price: Number(values.price), stock: Number(values.stock) };
        await api("/api/products", {
          method: editingProduct ? "PATCH" : "POST",
          body: JSON.stringify(editingProduct ? { ...body, id: editingProduct.id } : body),
        });
        await loadProducts();
        notify(editingProduct ? "Menu berhasil diperbarui." : "Menu baru berhasil ditambahkan.");
      } else if (modal === "member") {
        const body = { ...values, discountPercent: Number(values.discountPercent) };
        await api("/api/members", {
          method: editingMember ? "PATCH" : "POST",
          body: JSON.stringify(editingMember ? { id: editingMember.id, discountPercent: body.discountPercent } : body),
        });
        await loadMembers();
        notify(editingMember ? "Diskon member diperbarui." : "Member baru berhasil ditambahkan.");
      } else if (modal === "user") {
        await api("/api/users", { method: "POST", body: JSON.stringify(values) });
        const data = await api<{ users: Staff[] }>("/api/users");
        setStaff(data.users);
        notify("Akun kasir berhasil dibuat.");
      }
      setModal(null);
      setEditingProduct(null);
      setEditingMember(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Tidak dapat menyimpan data.", true);
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord(kind: "products" | "members" | "users", id: number, label: string) {
    if (!window.confirm(`Hapus ${label}?`)) return;
    try {
      await api(`/${kind}?id=${id}`, { method: "DELETE" });
      if (kind === "products") await loadProducts();
      if (kind === "members") await loadMembers();
      if (kind === "users") {
        const data = await api<{ users: Staff[] }>("/api/users");
        setStaff(data.users);
      }
      notify(`${label} berhasil dihapus.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Tidak dapat menghapus data.", true);
    }
  }

  const visibleItems = navItems.filter((item) => isAdmin || !item.admin);
  const mobileMainItems = visibleItems.slice(0, 3);
  const mobileExtraItems = visibleItems.slice(3);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">G<span>✳</span></div><div><strong>Kasir Toko Roti</strong><small>Roti hangat, hati senang</small></div></div>
        <p className="nav-caption">MENU UTAMA</p>
        <nav className="nav-list">
          {visibleItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${section === id ? "active" : ""}`} onClick={() => setSection(id)}><Icon size={18} />{label}</button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note"><Sparkles size={16} color="#a8561d" /><span>Setiap hari adalah kesempatan menyajikan yang terbaik.</span></div>
        <div className="profile"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{user.name}</strong><span>{isAdmin ? "Administrator" : "Kasir"}</span></div><button className="icon-button" title="Keluar" onClick={logout}><LogOut size={17} /></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title"><small>Halo, {user.name.split(" ")[0]} 👋</small><h1>{pageTitle}</h1></div>
          <div className="topbar-right"><span className="today-chip">{new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date())}</span><span className="role-chip">{isAdmin ? "ADMIN" : "KASIR"}</span><button className="icon-button topbar-logout" title="Keluar" onClick={logout}><LogOut size={17} /></button></div>
        </header>

        <div className="page-content">
          {section === "home" && <HomeView user={user} report={report} sales={sales} productCount={productCount} loading={loading} onNavigate={setSection} />}
          {section === "pos" && (
            <PosView
              products={filteredProducts} categories={categories} category={category} setCategory={setCategory}
              query={query} setQuery={setQuery} cart={cart} addToCart={addToCart} changeQuantity={changeQuantity}
              members={members} memberId={memberId} setMemberId={setMemberId} chosenMember={chosenMember}
              subtotal={subtotal} discount={discount} total={total} paid={paid} setPaid={setPaid}
              busy={busy} onCheckout={checkout} loading={loading}
              mobileCartOpen={mobileCartOpen} setMobileCartOpen={setMobileCartOpen}
            />
          )}
          {section === "reports" && (
            <ReportsView
              report={report} period={period} setPeriod={setPeriod} date={reportDate}
              setDate={setReportDate} isAdmin={isAdmin} loading={loading}
            />
          )}
          {section === "menu" && (
            <ProductsView products={products} loading={loading} query={query} setQuery={setQuery}
              onCreate={() => { setEditingProduct(null); setModal("product"); }}
              onEdit={(product) => { setEditingProduct(product); setModal("product"); }}
              onDelete={(product) => removeRecord("products", product.id, product.name)} />
          )}
          {section === "members" && (
            <MembersView members={members} loading={loading}
              onCreate={() => { setEditingMember(null); setModal("member"); }}
              onEdit={(member) => { setEditingMember(member); setModal("member"); }}
              onDelete={(member) => removeRecord("members", member.id, member.name)} />
          )}
          {section === "users" && (
            <UsersView staff={staff} loading={loading} currentUserId={user.id}
              onCreate={() => setModal("user")}
              onDelete={(person) => removeRecord("users", person.id, person.name)} />
          )}
        </div>
      </main>

      <nav className="mobile-nav">
        {mobileMainItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><Icon size={18} /><span>{label}</span></button>
        ))}
        {isAdmin && <button className={mobileExtraItems.some((item) => item.id === section) ? "active" : ""} onClick={() => setMobileMoreOpen((open) => !open)}><Menu size={18} /><span>Lainnya</span></button>}
      </nav>
      {mobileMoreOpen && isAdmin && <><button className="mobile-more-backdrop" aria-label="Tutup menu" onClick={() => setMobileMoreOpen(false)} /><div className="mobile-more-menu">{mobileExtraItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setSection(id); setMobileMoreOpen(false); }}><Icon size={17} />{label}</button>)}<button onClick={() => { setMobileMoreOpen(false); void logout(); }}><LogOut size={17} />Keluar</button></div></>}
      {mobileCartOpen && <button className="mobile-cart-backdrop" aria-label="Tutup keranjang" onClick={() => setMobileCartOpen(false)} />}

      {modal && (
        <Modal type={modal} product={editingProduct} member={editingMember} busy={busy}
          onClose={() => { setModal(null); setEditingProduct(null); setEditingMember(null); }} onSubmit={saveModal} />
      )}
      {completedSale && <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} onNewSale={() => { setCompletedSale(null); setSection("pos"); }} />}
      {toast && <div className={`toast ${toast.error ? "error" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}

function HomeView({ user, report, sales, productCount, loading, onNavigate }: {
  user: User; report: Report | null; sales: Sale[]; productCount: number; loading: boolean; onNavigate: (section: Section) => void;
}) {
  const stats = report?.summary;
  return (
    <>
      <section className="welcome-card"><p>{user.role === "admin" ? "DASHBOARD ADMIN" : "RUANG KERJA KASIR"}</p><h2>Selamat datang di toko roti ☀️</h2><span>Semoga hari ini penuh aroma roti hangat dan pelanggan yang bahagia.</span></section>
      <div className="stats-grid">
        <StatCard icon={CircleDollarSign} label="Omzet hari ini" value={rupiah(stats?.revenue ?? 0)} foot="Total penjualan hari ini" />
        <StatCard icon={ShoppingBag} label="Transaksi hari ini" value={String(stats?.transactionCount ?? 0)} foot="Transaksi tercatat" />
        <StatCard icon={Tag} label="Diskon diberikan" value={rupiah(stats?.discounts ?? 0)} foot="Hemat untuk pelanggan" />
        <StatCard icon={Boxes} label="Menu tersedia" value={loading ? "…" : String(productCount)} foot={user.role === "admin" ? "Kelola menu & stok" : "Produk siap dijual"} />
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Transaksi terbaru</h2><p>Aktivitas penjualan hari ini</p></div><button className="text-link" onClick={() => onNavigate("reports")}>Lihat rekap <ArrowRight size={14} /></button></div>
          <SalesTable sales={sales.slice(0, 6)} loading={loading} admin={user.role === "admin"} />
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Akses cepat</h2><p>Hal yang sering kamu lakukan</p></div></div>
          <div className="quick-actions">
            <button className="quick-action" onClick={() => onNavigate("pos")}><div className="quick-action-icon"><ShoppingCart size={17} /></div><span>Buka kasir<small>Catat transaksi baru</small></span><ArrowRight size={16} color="#a4937e" /></button>
            <button className="quick-action" onClick={() => onNavigate("reports")}><div className="quick-action-icon"><ChartNoAxesCombined size={17} /></div><span>Lihat rekap<small>Ringkasan transaksi</small></span><ArrowRight size={16} color="#a4937e" /></button>
            {user.role === "admin" && <button className="quick-action" onClick={() => onNavigate("menu")}><div className="quick-action-icon"><Package size={17} /></div><span>Kelola menu<small>Atur produk dan stok</small></span><ArrowRight size={16} color="#a4937e" /></button>}
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, foot }: { icon: typeof Menu; label: string; value: string; foot: string }) {
  return <article className="stat-card"><div className="stat-icon"><Icon size={18} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>;
}

function SalesTable({ sales, loading, admin }: { sales: Sale[]; loading: boolean; admin: boolean }) {
  return <div className="table-wrap"><table><thead><tr><th>Invoice</th>{admin && <th>Kasir</th>}<th>Waktu</th><th>Item</th><th>Total</th></tr></thead><tbody>
    {loading && !sales.length ? <tr><td colSpan={admin ? 5 : 4} className="empty-state">Memuat transaksi...</td></tr>
      : sales.length ? sales.map((sale) => <tr key={sale.id}><td className="strong-cell">{sale.invoice}</td>{admin && <td>{sale.cashierName ?? "—"}</td>}<td className="muted-cell">{timeLabel(sale.createdAt)}</td><td>{sale.itemCount} item</td><td className="strong-cell">{rupiah(sale.total)}</td></tr>)
        : <tr><td colSpan={admin ? 5 : 4} className="empty-state">Belum ada transaksi hari ini.</td></tr>}
  </tbody></table></div>;
}

function PosView(props: {
  products: Product[]; categories: string[]; category: string; setCategory: (value: string) => void;
  query: string; setQuery: (value: string) => void; cart: CartLine[]; addToCart: (product: Product) => void;
  changeQuantity: (id: number, amount: number) => void; members: Member[]; memberId: string;
  setMemberId: (value: string) => void; chosenMember?: Member; subtotal: number; discount: number; total: number;
  paid: string; setPaid: (value: string) => void; busy: boolean; onCheckout: () => void;
  loading: boolean; mobileCartOpen: boolean; setMobileCartOpen: (value: boolean) => void;
}) {
  const hasEnough = Number(props.paid) >= props.total && Number(props.paid) > 0;
  return (
    <div className="pos-layout">
      <section className="pos-catalog">
        <div className="toolbar"><div className="toolbar-group"><span className="input-wrap search-input"><Search size={16} /><input placeholder="Cari roti favorit..." value={props.query} onChange={(event) => props.setQuery(event.target.value)} /></span></div><span className="muted-cell" style={{ fontSize: 12 }}>{props.products.length} menu</span></div>
        <div className="category-row">{props.categories.map((item) => <button key={item} className={`category-chip ${props.category === item ? "active" : ""}`} onClick={() => props.setCategory(item)}>{item}</button>)}</div>
        {props.loading ? <div className="panel empty-state"><LoaderCircle className="spin" size={20} /> Memuat menu...</div>
          : props.products.length ? <div className="cards-list">{props.products.map((product) => {
            const inCart = props.cart.find((line) => line.product.id === product.id)?.quantity ?? 0;
            return <article key={product.id} className="product-card" onClick={() => product.stock > inCart && props.addToCart(product)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" && product.stock > inCart) props.addToCart(product); }}>
              <div className="product-emoji">{productEmoji(product.category)}</div><h3>{product.name}</h3><span className="product-category">{product.category}</span>
              <div className="product-bottom"><div><div className="product-price">{rupiah(product.price)}</div><div className="stock-text">Stok {product.stock}</div></div><button className="add-product" aria-label={`Tambah ${product.name}`} disabled={product.stock <= inCart} onClick={(event) => { event.stopPropagation(); props.addToCart(product); }}><Plus size={17} /></button></div>
            </article>;
          })}</div> : <div className="panel empty-state">Menu tidak ditemukan.</div>}
      </section>
      {props.cart.length > 0 && <button className="mobile-cart-bar" onClick={() => props.setMobileCartOpen(true)}>
        <span className="mobile-cart-count">{props.cart.reduce((n, line) => n + line.quantity, 0)}</span>
        <span>Keranjang belanja<small>{rupiah(props.total)}</small></span><span className="mobile-cart-open">Lihat <ArrowRight size={15} /></span>
      </button>}
      <aside className={`cart-panel ${props.mobileCartOpen ? "mobile-open" : ""}`}>
        <div className="cart-heading"><h2><ShoppingBag size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />Keranjang</h2><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="cart-count">{props.cart.reduce((n, line) => n + line.quantity, 0)} item</span><button className="icon-button mobile-cart-close" aria-label="Tutup keranjang" onClick={() => props.setMobileCartOpen(false)}><X size={18} /></button></div></div>
        <div className="cart-lines">{props.cart.length ? props.cart.map((line) => <div className="cart-line" key={line.product.id}>
          <div><strong>{line.product.name}</strong><small>{rupiah(line.product.price)} × {line.quantity} = {rupiah(line.product.price * line.quantity)}</small></div>
          <div className="quantity-control"><button aria-label="Kurangi jumlah" onClick={() => props.changeQuantity(line.product.id, -1)}><Minus size={13} /></button><span>{line.quantity}</span><button aria-label="Tambah jumlah" onClick={() => props.changeQuantity(line.product.id, 1)} disabled={line.quantity >= line.product.stock}><Plus size={13} /></button></div>
        </div>) : <div className="cart-empty"><ShoppingCart size={24} style={{ display: "block", margin: "0 auto 9px", opacity: .5 }} />Pilih roti untuk memulai transaksi.</div>}</div>
        <div className="cart-summary">
          <div className="summary-line"><span>Subtotal</span><b>{rupiah(props.subtotal)}</b></div>
          <div className="summary-line"><span>Diskon{props.chosenMember ? ` · ${props.chosenMember.discountPercent}%` : ""}</span><b>− {rupiah(props.discount)}</b></div>
          <div className="summary-line summary-total"><span>Total</span><b>{rupiah(props.total)}</b></div>
        </div>
        <div className="cart-form">
          <label>Member (opsional)<select className="select-input" value={props.memberId} onChange={(event) => props.setMemberId(event.target.value)}><option value="">Tanpa member</option>{props.members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.discountPercent}%</option>)}</select></label>
          <label>Uang dibayar<input className="text-input" type="number" min="0" step="1000" placeholder="Masukkan nominal" value={props.paid} onChange={(event) => props.setPaid(event.target.value)} /></label>
          {props.paid && Number(props.paid) >= props.total && <div className="summary-line"><span>Kembalian</span><b>{rupiah(Number(props.paid) - props.total)}</b></div>}
          <button className="button button-primary checkout-button" onClick={props.onCheckout} disabled={!props.cart.length || !hasEnough || props.busy}>
            {props.busy ? <LoaderCircle className="spin" size={18} /> : <><Banknote size={17} /> Bayar {rupiah(props.total)}</>}
          </button>
        </div>
      </aside>
    </div>
  );
}

function ReportsView({ report, period, setPeriod, date, setDate, isAdmin, loading }: {
  report: Report | null; period: "day" | "month"; setPeriod: (value: "day" | "month") => void;
  date: string; setDate: (value: string) => void; isAdmin: boolean; loading: boolean;
}) {
  const displayPeriod = isAdmin ? period : "day";
  const chart = report?.chart ?? [];
  const max = Math.max(1, ...chart.map((point) => Number(point.revenue)));
  return (
    <>
      <section className="panel">
        <div className="toolbar">
          <div><div className="panel-heading" style={{ margin: 0 }}><div><h2>{displayPeriod === "day" ? "Rekap harian" : "Rekap bulanan"}</h2><p>{displayPeriod === "day" ? "Pantau transaksi dan omzet hari pilihan." : "Laporan penjualan untuk bulan pilihan."}</p></div></div></div>
          <div className="report-controls">
            {isAdmin && <div className="segmented"><button className={period === "day" ? "active" : ""} onClick={() => setPeriod("day")}>Harian</button><button className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>Bulanan</button></div>}
            {isAdmin
              ? <label className="filter-date"><Clock3 size={15} /><input className="text-input" type={displayPeriod === "month" ? "month" : "date"} value={displayPeriod === "month" ? date.slice(0, 7) : date} onChange={(event) => setDate(displayPeriod === "month" ? `${event.target.value}-01` : event.target.value)} /></label>
              : <span className="today-chip cashier-report-date"><Clock3 size={15} />Hari ini · {dateLabel(`${date}T12:00:00`)}</span>}
          </div>
        </div>
        <div className="stats-grid">
          <StatCard icon={CircleDollarSign} label="Total omzet" value={rupiah(report?.summary.revenue ?? 0)} foot={displayPeriod === "day" ? "Pada tanggal ini" : "Pada bulan ini"} />
          <StatCard icon={ShoppingBag} label="Transaksi" value={String(report?.summary.transactionCount ?? 0)} foot="Jumlah transaksi tercatat" />
          <StatCard icon={Tag} label="Total diskon" value={rupiah(report?.summary.discounts ?? 0)} foot="Diskon member terpakai" />
          <StatCard icon={TrendingUp} label="Rata-rata transaksi" value={rupiah(report?.summary.transactionCount ? report.summary.revenue / report.summary.transactionCount : 0)} foot="Omzet ÷ transaksi" />
        </div>
        <div className="panel-heading"><div><h2>{displayPeriod === "day" ? "Penjualan per jam" : "Penjualan per hari"}</h2><p>Pergerakan omzet pada periode ini</p></div>{loading && <LoaderCircle className="spin" size={17} />}</div>
        {chart.length ? <div className="chart">{chart.map((point, index) => {
          const label = displayPeriod === "day" ? `${String(point.hour).padStart(2, "0")}.00` : String(point.day ?? "");
          const height = Math.max(3, Number(point.revenue) / max * 100);
          const tooltip = displayPeriod === "day" ? label : `Tanggal ${label}`;
          return <div className="chart-column" key={label + index} title={`${tooltip} · ${rupiah(point.revenue)}`}><span className="chart-value">{point.revenue ? rupiah(point.revenue).replace(",00", "") : ""}</span><div className="chart-bar" style={{ height: `${height}%`, opacity: point.revenue ? 1 : .22 }} /><span className="chart-label">{label}</span></div>;
        })}</div> : <div className="empty-state">{loading ? "Memuat laporan..." : "Belum ada penjualan pada periode ini."}</div>}
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Daftar transaksi</h2><p>Hingga 100 transaksi terbaru pada periode pilihan</p></div></div>
        <SalesTable sales={report?.sales ?? []} loading={loading} admin={isAdmin} />
      </section>
    </>
  );
}

function ProductsView({ products, loading, query, setQuery, onCreate, onEdit, onDelete }: {
  products: Product[]; loading: boolean; query: string; setQuery: (value: string) => void;
  onCreate: () => void; onEdit: (product: Product) => void; onDelete: (product: Product) => void;
}) {
  const filtered = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel">
    <div className="panel-heading"><div><h2>Menu & stok</h2><p>Atur nama menu, harga jual, dan ketersediaan stok.</p></div><button className="button button-primary small-button" onClick={onCreate}><Plus size={15} /> Tambah menu</button></div>
    <div className="toolbar"><span className="input-wrap search-input"><Search size={16} /><input placeholder="Cari menu..." value={query} onChange={(event) => setQuery(event.target.value)} /></span><span className="muted-cell" style={{ fontSize: 12 }}>{filtered.length} menu aktif</span></div>
    <div className="table-wrap"><table><thead><tr><th>Nama menu</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5} className="empty-state">Memuat menu...</td></tr> : filtered.length ? filtered.map((product) => <tr key={product.id}><td className="strong-cell">{productEmoji(product.category)} &nbsp;{product.name}</td><td>{product.category}</td><td>{rupiah(product.price)}</td><td><span className="status-pill" style={product.stock < 5 ? { color: "#a45132", background: "#fff0e9" } : undefined}>{product.stock} pcs</span></td><td><button className="button button-soft small-button" onClick={() => onEdit(product)}>Edit</button><button className="icon-button" aria-label={`Hapus ${product.name}`} onClick={() => onDelete(product)}><Trash2 size={15} /></button></td></tr>) : <tr><td colSpan={5} className="empty-state">Belum ada menu yang cocok.</td></tr>}
    </tbody></table></div>
  </section>;
}

function MembersView({ members, loading, onCreate, onEdit, onDelete }: {
  members: Member[]; loading: boolean; onCreate: () => void; onEdit: (member: Member) => void; onDelete: (member: Member) => void;
}) {
  return <section className="panel">
    <div className="panel-heading"><div><h2>Member pelanggan</h2><p>Berikan diskon khusus untuk pelanggan setia.</p></div><button className="button button-primary small-button" onClick={onCreate}><Plus size={15} /> Tambah member</button></div>
    <div className="table-wrap"><table><thead><tr><th>Nama member</th><th>Nomor telepon</th><th>Diskon</th><th>Bergabung</th><th>Aksi</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5} className="empty-state">Memuat member...</td></tr> : members.length ? members.map((member) => <tr key={member.id}><td className="strong-cell">{member.name}</td><td>{member.phone}</td><td><span className="status-pill"><Tag size={12} />{member.discountPercent}%</span></td><td className="muted-cell">Member toko</td><td><button className="button button-soft small-button" onClick={() => onEdit(member)}>Atur diskon</button><button className="icon-button" aria-label={`Hapus ${member.name}`} onClick={() => onDelete(member)}><Trash2 size={15} /></button></td></tr>) : <tr><td colSpan={5} className="empty-state">Belum ada member. Tambahkan pelanggan setia pertamamu.</td></tr>}
    </tbody></table></div>
  </section>;
}

function UsersView({ staff, loading, currentUserId, onCreate, onDelete }: {
  staff: Staff[]; loading: boolean; currentUserId: number; onCreate: () => void; onDelete: (staff: Staff) => void;
}) {
  return <section className="panel">
    <div className="panel-heading"><div><h2>Pengguna & kasir</h2><p>Kelola akun yang dapat masuk ke aplikasi kasir.</p></div><button className="button button-primary small-button" onClick={onCreate}><Plus size={15} /> Buat akun kasir</button></div>
    <div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Bergabung</th><th>Aksi</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5} className="empty-state">Memuat pengguna...</td></tr> : staff.map((person) => <tr key={person.id}><td className="strong-cell">{person.name}{person.id === currentUserId ? " (kamu)" : ""}</td><td>{person.username}</td><td><span className={`status-pill ${person.role}`}>{person.role === "admin" ? "Admin" : "Kasir"}</span></td><td className="muted-cell">{dateLabel(person.createdAt)}</td><td>{person.role === "cashier" && person.id !== currentUserId && <button className="button button-danger small-button" onClick={() => onDelete(person)}>Hapus</button>}</td></tr>)}
      {!loading && !staff.length && <tr><td colSpan={5} className="empty-state">Belum ada pengguna.</td></tr>}
    </tbody></table></div>
  </section>;
}

function Modal({ type, product, member, busy, onClose, onSubmit }: {
  type: Exclude<ModalType, null>; product: Product | null; member: Member | null; busy: boolean;
  onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const title = type === "product" ? (product ? "Edit menu" : "Tambah menu")
    : type === "member" ? (member ? "Atur diskon member" : "Tambah member") : "Buat akun kasir";
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal"><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>
      <form className="modal-form" onSubmit={onSubmit}>
        {type === "product" && <>
          <label>Nama menu<input className="text-input" name="name" required maxLength={120} defaultValue={product?.name} placeholder="Contoh: Roti cokelat" /></label>
          <label>Kategori<input className="text-input" name="category" required maxLength={60} defaultValue={product?.category} placeholder="Contoh: Roti manis" /></label>
          <label>Harga jual (Rp)<input className="text-input" name="price" type="number" min="0" step="100" required defaultValue={product?.price} placeholder="8000" /></label>
          <label>Stok tersedia<input className="text-input" name="stock" type="number" min="0" step="1" required defaultValue={product?.stock} placeholder="20" /></label>
        </>}
        {type === "member" && <>
          {!member && <><label>Nama member<input className="text-input" name="name" required maxLength={100} placeholder="Nama lengkap" /></label><label>Nomor telepon<input className="text-input" name="phone" type="tel" required minLength={8} maxLength={24} placeholder="08xxxxxxxxxx" /></label></>}
          <label>Diskon member (%)<input className="text-input" name="discountPercent" type="number" min="0" max="100" step="0.5" required defaultValue={member?.discountPercent ?? 5} /></label>
        </>}
        {type === "user" && <>
          <label>Nama kasir<input className="text-input" name="name" required maxLength={100} placeholder="Nama lengkap" /></label>
          <label>Username<input className="text-input" name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" placeholder="contoh: kasir_sore" /></label>
          <label>Password awal<input className="text-input" name="password" type="password" required minLength={8} maxLength={72} placeholder="Minimal 8 karakter" /></label>
          <p className="muted-cell" style={{ fontSize: 11, margin: 0 }}>Akun ini akan memiliki akses kasir, bukan admin.</p>
        </>}
        <div className="modal-actions"><button type="button" className="button button-outline small-button" onClick={onClose}>Batal</button><button className="button button-primary small-button" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={15} />} Simpan</button></div>
      </form>
    </section>
  </div>;
}

function ReceiptModal({ sale, onClose, onNewSale }: {
  sale: CompletedSale; onClose: () => void; onNewSale: () => void;
}) {
  return (
    <div className="modal-backdrop receipt-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="receipt-modal">
        <div className="receipt-success">
          <div className="receipt-success-icon"><CheckCircle2 size={25} /></div>
          <div><h2>Pembelian berhasil!</h2><p>Pembayaran telah tersimpan.</p></div>
          <button className="icon-button receipt-close" aria-label="Tutup struk" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="receipt-paper">
          <div className="receipt-store"><div className="brand-mark">G<span>✳</span></div><h3>Kasir Toko Roti</h3><p>Roti hangat, hati senang</p></div>
          <div className="receipt-meta"><span>No. transaksi</span><b>{sale.invoice}</b><span>Tanggal</span><b>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(sale.createdAt))}</b><span>Kasir</span><b>{sale.cashierName}</b>{sale.memberName && <><span>Member</span><b>{sale.memberName}</b></>}</div>
          <div className="receipt-items">
            {sale.items.map((item, index) => <div className="receipt-item" key={`${item.name}-${index}`}><div><b>{item.name}</b><span>{item.quantity} × {rupiah(item.price)}</span></div><b>{rupiah(item.lineTotal)}</b></div>)}
          </div>
          <div className="receipt-totals">
            <div><span>Subtotal</span><b>{rupiah(sale.subtotal)}</b></div>
            {sale.discount > 0 && <div><span>Diskon member</span><b>− {rupiah(sale.discount)}</b></div>}
            <div className="receipt-grand-total"><span>Total</span><b>{rupiah(sale.total)}</b></div>
            <div><span>Tunai</span><b>{rupiah(sale.paid)}</b></div>
            <div><span>Kembalian</span><b>{rupiah(sale.changeAmount)}</b></div>
          </div>
          <p className="receipt-thanks">Terima kasih sudah berbelanja!<br />Semoga harimu semanis roti kami ♡</p>
        </div>
        <div className="receipt-actions">
          <button className="button button-outline" onClick={onClose}>Tutup</button>
          <button className="button button-soft" onClick={() => window.print()}><Printer size={17} /> Cetak struk</button>
          <button className="button button-primary" onClick={onNewSale}><Plus size={17} /> Transaksi baru</button>
        </div>
      </section>
    </div>
  );
}
