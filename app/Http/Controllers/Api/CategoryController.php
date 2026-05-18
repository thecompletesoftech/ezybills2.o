<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::where('business_id', auth()->user()->business_id)
            ->orderBy('name');

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // ?per_page=all returns full list (used by POS, product form dropdowns)
        if ($request->query('per_page') === 'all') {
            return $this->success($query->get(), 'Categories retrieved');
        }

        $perPage = min((int) ($request->per_page ?? 50), 200);
        return $this->paginated($query->paginate($perPage), 'Categories retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ]);

        $businessId = auth()->user()->business_id;

        if ($request->hasFile('image')) {
            $validated['image_url'] = $this->processImage($request->file('image'), 'categories');
        }

        $category = Category::create([...$validated, 'business_id' => $businessId]);
        return $this->success($category, 'Category created', 201);
    }

    public function show(Category $category)
    {
        return $this->success($category, 'Category retrieved');
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_url'] = $this->processImage($request->file('image'), 'categories');
        }

        $category->update($validated);
        return $this->success($category, 'Category updated');
    }

    public function destroy(Category $category)
    {
        if ($category->products()->exists()) {
            return $this->error('Cannot delete category — it has products assigned.', 422);
        }
        $category->delete();
        return $this->success(null, 'Category deleted');
    }

    // ─── Image helper ────────────────────────────────────────────────────────
    private function processImage($file, string $folder): string
    {
        $img = imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (!$img) {
            $path = $file->store($folder, 'public');
            return '/storage/' . $path;
        }

        $srcW = imagesx($img);
        $srcH = imagesy($img);
        $dst  = imagecreatetruecolor(400, 400);

        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefill($dst, 0, 0, $white);

        $ratio = min(400 / $srcW, 400 / $srcH);
        $newW  = (int) round($srcW * $ratio);
        $newH  = (int) round($srcH * $ratio);
        $xOff  = (int) round((400 - $newW) / 2);
        $yOff  = (int) round((400 - $newH) / 2);

        imagecopyresampled($dst, $img, $xOff, $yOff, 0, 0, $newW, $newH, $srcW, $srcH);

        $filename = $folder . '/' . Str::uuid() . '.jpg';
        ob_start();
        imagejpeg($dst, null, 85);
        $jpeg = ob_get_clean();
        imagedestroy($img);
        imagedestroy($dst);

        Storage::disk('public')->put($filename, $jpeg);
        return '/storage/' . $filename;
    }

    private function error(string $message, int $status): \Illuminate\Http\JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], $status);
    }
}
