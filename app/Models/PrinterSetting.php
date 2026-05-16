<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrinterSetting extends Model
{
    protected $fillable = [
        'business_id',
        'paper_size',
        'connection_type',
        'printer_name',
        'bluetooth_address',
        'network_ip',
        'network_port',
        'auto_print',
        'print_logo',
        'print_address',
        'print_mobile',
        'print_gst',
        'print_footer',
        'footer_text',
        'copies',
    ];

    protected $casts = [
        'auto_print'    => 'boolean',
        'print_logo'    => 'boolean',
        'print_address' => 'boolean',
        'print_mobile'  => 'boolean',
        'print_gst'     => 'boolean',
        'print_footer'  => 'boolean',
        'network_port'  => 'integer',
        'copies'        => 'integer',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
