import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi, categoriesApi, outletsApi } from '../lib/api'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, Package, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/products')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ProductsPage,
})

function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [outletFilter, setOutletFilter] = useState('')
  const [limit, setLimit] = useState(10)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [productToDelete, setProductToDelete] = useState<any>(null)

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, outletFilter, limit],
    queryFn: async () => {
      const response = await productsApi.getAll({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        outletId: outletFilter || undefined,
        limit: limit || undefined,
      })
      return response.data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesApi.getAll()
      return response.data
    },
  })

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await outletsApi.getAll()).data,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produk berhasil dihapus')
      setProductToDelete(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Gagal menghapus produk')
      setProductToDelete(null)
    }
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleDelete = (product: any) => {
    setProductToDelete(product)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Produk</h1>
            <p className="text-slate-500">Kelola produk toko Anda</p>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null)
              setIsModalOpen(true)
            }}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5" />
            Tambah Produk
          </button>
        </div>

        {/* Filters */}
        <div className="card flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input md:w-48"
          >
            <option value="">Semua Kategori</option>
            {categories?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="input md:w-48"
          >
            <option value="">Semua Gudang (Total)</option>
            {outlets?.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="input md:w-32"
          >
            <option value={5}>5 Item</option>
            <option value={10}>10 Item</option>
            <option value={25}>25 Item</option>
            <option value={50}>50 Item</option>
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="table-header">Produk</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Kategori</th>
                  <th className="table-header">Harga</th>
                  <th className="table-header">Stok</th>
                  <th className="table-header text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : products?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Belum ada produk</p>
                    </td>
                  </tr>
                ) : (
                  products?.map((product: any) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-indigo-600" />
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                          {product.sku}
                        </span>
                      </td>
                      <td className="table-cell">{product.category?.name}</td>
                      <td className="table-cell font-medium">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="table-cell">
                        {product.trackStock === false ? (
                           <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Jasa</span>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.stock > 10
                                ? 'bg-green-100 text-green-700'
                                : product.stock > 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {product.stock}
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          categories={categories || []}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Hapus</h2>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus produk <b>{productToDelete.name}</b>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToDelete(null)} 
                className="btn btn-secondary flex-1"
                disabled={deleteMutation.isPending}
              >
                Batal
              </button>
              <button 
                onClick={() => deleteMutation.mutate(productToDelete.id)} 
                className="btn btn-danger flex-1"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ProductModal({
  product,
  categories,
  onClose,
}: {
  product: any
  categories: any[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    price: product?.price || '',
    stock: product?.stock || 0,
    categoryId: product?.categoryId || '',
    outletId: '',
    trackStock: product?.trackStock ?? true,
  })
  
  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => (await outletsApi.getAll()).data,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price as string),
        stock: formData.trackStock ? parseInt(formData.stock as string) : 0,
        trackStock: formData.trackStock,
      }

      if (product) {
        await productsApi.update(product.id, data)
        toast.success('Produk berhasil diupdate')
      } else {
        await productsApi.create(data)
        toast.success('Produk berhasil ditambahkan')
      }

      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan produk')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {product ? 'Edit Produk' : 'Tambah Produk'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label">Nama Produk</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">SKU</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Kategori</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="input"
              required
            >
              <option value="">Pilih kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Harga</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input"
                required
                min="0"
              />
            </div>
            <div>
              <label className="label">Stok {product ? '(Total)' : '(Awal)'}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="input w-24 disabled:bg-slate-100 disabled:text-slate-500"
                  required={formData.trackStock}
                  min="0"
                  disabled={!!product || !formData.trackStock}
                />
                {!product && (
                  <select
                    value={formData.outletId}
                    onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                    className="input flex-1 disabled:bg-slate-100 disabled:text-slate-500"
                    required={formData.trackStock && Number(formData.stock) > 0}
                    disabled={!formData.trackStock}
                  >
                    <option value="">Ke Gudang...</option>
                    {outlets?.map((o: any) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {product && <p className="text-xs text-slate-500 mt-1">Stok hanya dapat diubah melalui menu Stok.</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="trackStock"
              checked={formData.trackStock}
              onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="trackStock" className="text-sm font-medium text-slate-700">
              Lacak Stok Fisik (Nonaktifkan untuk layanan/jasa)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={isLoading}>
              Batal
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
