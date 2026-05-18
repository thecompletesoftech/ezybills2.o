<?php

namespace App\Http\Controllers\Api;

use App\Models\PrinterSetting;
use Illuminate\Http\Request;

class PrinterSettingsController extends Controller
{
    public function show()
    {
        $settings = PrinterSetting::firstOrCreate(
            ['business_id' => auth()->user()->business_id],
            [
                'paper_size'       => '80mm',
                'connection_type'  => 'usb',
                'auto_print'       => false,
                'print_logo'       => true,
                'print_address'    => true,
                'print_mobile'     => true,
                'print_gst'        => true,
                'print_footer'     => true,
                'footer_text'      => 'Thank you for your business!',
                'print_upi_qr'     => false,
                'copies'           => 1,
            ]
        );
        return $this->success($settings, 'Printer settings retrieved');
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'paper_size'        => 'sometimes|in:58mm,80mm,A4',
            'connection_type'   => 'sometimes|in:usb,bluetooth,network',
            'printer_name'      => 'nullable|string|max:200',
            'bluetooth_address' => 'nullable|string|max:50',
            'network_ip'        => 'nullable|ip',
            'network_port'      => 'nullable|integer|min:1|max:65535',
            'auto_print'        => 'nullable|boolean',
            'print_logo'        => 'nullable|boolean',
            'print_address'     => 'nullable|boolean',
            'print_mobile'      => 'nullable|boolean',
            'print_gst'         => 'nullable|boolean',
            'print_footer'      => 'nullable|boolean',
            'footer_text'       => 'nullable|string|max:500',
            'upi_id'            => 'nullable|string|max:100',
            'print_upi_qr'      => 'nullable|boolean',
            'copies'            => 'nullable|integer|min:1|max:5',
        ]);

        $settings = PrinterSetting::updateOrCreate(
            ['business_id' => auth()->user()->business_id],
            $validated
        );
        return $this->success($settings, 'Printer settings updated');
    }
}
