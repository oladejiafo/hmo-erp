<?php
/**
 * FILE: database/migrations/2025_07_04_000001_create_help_articles_table.php
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('help_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->enum('category', [
                'getting_started',
                'enrollees',
                'claims',
                'pre_auth',
                'plans',
                'reports',
                'finance',
                'hcps',
                'administration',
                'self_service',
            ]);
            $table->longText('content');
            $table->json('visible_to_roles')->nullable();
            $table->json('related_pages')->nullable();
            $table->boolean('is_published')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('view_count')->default(0);
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('not_helpful_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['category', 'is_published']);
            $table->fullText(['title', 'content']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('help_articles');
    }
};