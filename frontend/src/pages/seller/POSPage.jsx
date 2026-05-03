import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, X } from 'lucide-react';
import api from '../../services/api';
import { Card, PageHeader, Button, Spinner, Badge } from '../../components/ui';
import toast from 'react-hot-toast';
import { t } from '../../i18n';

export default function POSPage() {
  const [products, setProducts]   = useState([]);
  const [search, setSearch]       = useState('');
  const [cart, setCart]           = useState([]);
  const [discount, setDiscount]   = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [note, setNote]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [searching, setSearching] = useState(false);
  const [success, setSuccess]     = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setSearching(true);
      try {
        const res = await api.get('/products', { params: { search, limit: 20, isActive: 'true' } });
        setProducts(res.data.products.filter((p) => (p.inventory?.quantity || 0) > 0));
      } finally {
        setSearching(false);
      }
    };
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      const maxQty = product.inventory?.quantity || 0;
      if (existing) {
        if (existing.qty >= maxQty) { toast.error(`Максимум ${maxQty} шт.`); return prev; }
        return prev.map((c) => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        qty: 1,
        maxQty,
      }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) => prev
      .map((c) => c.productId === productId ? { ...c, qty: Math.max(1, Math.min(c.maxQty, c.qty + delta)) } : c)
      .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((c) => c.productId !== productId));

  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartTotal    = Math.max(0, cartSubtotal - Number(discount));
  const cartCount    = cart.reduce((s, c) => s + c.qty, 0);

  const handleSale = async () => {
    if (cart.length === 0) { toast.error('Корзина пуста'); return; }
    setLoading(true);
    try {
      await api.post('/sales', {
        items: cart.map((c) => ({ productId: c.productId, quantity: c.qty })),
        discount: Number(discount),
        paymentMethod: payMethod,
        note,
      });
      setSuccess(true);
      setTimeout(() => {
        setCart([]); setDiscount(0); setNote(''); setPayMethod('cash'); setSuccess(false);
        toast.success(t.pos.saleSuccess);
        searchRef.current?.focus();
      }, 1800);
    } catch (err) {
      toast.error(err.response?.data?.message || t.pos.saleFailed);
    } finally {
      setLoading(false);
    }
  };

  const PAY_OPTS = [
    { value: 'cash', label: t.pos.cash },
    { value: 'card', label: t.pos.card },
    { value: 'qr',   label: t.pos.qr   },
  ];

  return (
    <div>
      <PageHeader title={t.pos.title} subtitle={t.pos.subtitle} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', alignItems: 'start' }}>
        {/* Product search */}
        <div>
          <Card style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input ref={searchRef} placeholder={t.pos.searchProduct} value={search}
                onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '34px' }} autoFocus />
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {searching ? (
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: '2rem', gap: '8px', color: 'var(--text-3)' }}>
                <Spinner /> Поиск…
              </div>
            ) : products.length === 0 ? (
              <div style={{ gridColumn: '1/-1', color: 'var(--text-3)', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                Товары не найдены
              </div>
            ) : products.map((p) => {
              const inCart = cart.find((c) => c.productId === p.id);
              return (
                <button key={p.id} onClick={() => addToCart(p)} style={{
                  background: inCart ? 'var(--accent-dim)' : 'var(--bg-2)',
                  border: `1px solid ${inCart ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '0.875rem',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '4px' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    {p.sku}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-2)', fontSize: '0.95rem' }}>
                      {Number(p.price).toLocaleString('ru-RU')} ₸
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {p.inventory?.quantity} шт.
                    </span>
                  </div>
                  {inCart && (
                    <div style={{
                      marginTop: '6px', fontSize: '0.72rem', fontWeight: 600,
                      color: 'var(--accent-2)', display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      ✓ В корзине: {inCart.qty} шт.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} /> {t.pos.cart}
                {cartCount > 0 && (
                  <span style={{
                    background: 'var(--accent)', color: '#fff', borderRadius: '50%',
                    width: '20px', height: '20px', fontSize: '0.72rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{cartCount}</span>
                )}
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{
                  background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: '6px',
                  padding: '3px 8px', color: 'var(--red)', cursor: 'pointer', fontSize: '0.75rem',
                }}>
                  {t.pos.clearCart}
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '2rem 1rem', fontSize: '0.875rem' }}>
                <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <div>{t.pos.emptyCart}</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.productId} style={{
                      background: 'var(--bg-3)', borderRadius: '8px', padding: '0.6rem 0.75rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{item.sku}</div>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} style={{
                          background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '0',
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => updateQty(item.productId, -1)} style={{
                            width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border)',
                            background: 'var(--bg-4)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}><Minus size={12} /></button>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.productId, 1)} disabled={item.qty >= item.maxQty} style={{
                            width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border)',
                            background: 'var(--bg-4)', color: 'var(--text)', cursor: item.qty >= item.maxQty ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: item.qty >= item.maxQty ? 0.4 : 1,
                          }}><Plus size={12} /></button>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)' }}>
                          {(item.price * item.qty).toLocaleString('ru-RU')} ₸
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discount */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>
                    {t.pos.discount} (₸)
                  </label>
                  <input type="number" min="0" max={cartSubtotal} value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }} />
                </div>

                {/* Payment method */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>
                    {t.pos.paymentMethod}
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {PAY_OPTS.map((o) => (
                      <button key={o.value} onClick={() => setPayMethod(o.value)} style={{
                        flex: 1, padding: '0.45rem', borderRadius: '6px',
                        border: `1px solid ${payMethod === o.value ? 'var(--accent)' : 'var(--border)'}`,
                        background: payMethod === o.value ? 'var(--accent-dim)' : 'var(--bg-3)',
                        color: payMethod === o.value ? 'var(--accent-2)' : 'var(--text-2)',
                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                      }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>
                    {t.common.note}
                  </label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
                </div>

                {/* Total */}
                <div style={{
                  background: 'var(--bg-3)', borderRadius: '8px', padding: '0.75rem',
                  marginBottom: '1rem',
                }}>
                  {Number(discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '4px' }}>
                      <span>Подытог:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{cartSubtotal.toLocaleString('ru-RU')} ₸</span>
                    </div>
                  )}
                  {Number(discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--red)', marginBottom: '4px' }}>
                      <span>Скидка:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>-{Number(discount).toLocaleString('ru-RU')} ₸</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.pos.totalAmount}:</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--green)' }}>
                      {cartTotal.toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSale}
                  disabled={loading || success}
                  style={{
                    width: '100%', padding: '0.85rem',
                    background: success ? 'var(--green)' : 'var(--accent)',
                    color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                    fontWeight: 700, fontSize: '1rem', cursor: loading || success ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-display)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'background 0.3s',
                  }}
                >
                  {success
                    ? <><CheckCircle2 size={20} /> Продажа оформлена!</>
                    : loading
                    ? <><Spinner size={18} /> {t.pos.processing}</>
                    : <><CheckCircle2 size={20} /> {t.pos.completeSale}</>
                  }
                </button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
