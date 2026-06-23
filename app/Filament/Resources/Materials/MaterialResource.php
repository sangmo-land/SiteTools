<?php

namespace App\Filament\Resources\Materials;

use App\Filament\Resources\Materials\Pages\ManageMaterials;
use App\Models\Material;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use UnitEnum;

class MaterialResource extends Resource
{
    protected static ?string $model = Material::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $navigationLabel = 'Materials';

    protected static ?string $modelLabel = 'material';

    protected static ?string $pluralModelLabel = 'materials';

    protected static string|UnitEnum|null $navigationGroup = 'Catalogue';

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true),
                Select::make('category')
                    ->required()
                    ->searchable()
                    ->options([
                        'Cement & Concrete' => 'Cement & Concrete',
                        'Blocks & Bricks' => 'Blocks & Bricks',
                        'Steel & Rebar' => 'Steel & Rebar',
                        'Aggregates' => 'Aggregates',
                        'Timber & Formwork' => 'Timber & Formwork',
                        'Roofing' => 'Roofing',
                        'Plumbing' => 'Plumbing',
                        'Electrical' => 'Electrical',
                        'Paint & Finishes' => 'Paint & Finishes',
                        'Tools & Equipment' => 'Tools & Equipment',
                        'Transport' => 'Transport',
                        'Labour Support' => 'Labour Support',
                        'Other' => 'Other',
                    ]),
                TextInput::make('unit')
                    ->required()
                    ->maxLength(30),
                TextInput::make('default_unit_price')
                    ->label('Default unit price (FCFA)')
                    ->numeric()
                    ->prefix('FCFA')
                    ->minValue(0)
                    ->step(1)
                    ->required(),
                Toggle::make('is_active')
                    ->label('Available in expense dropdown')
                    ->default(true),
                Textarea::make('description')
                    ->columnSpanFull()
                    ->maxLength(1000),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('category')
                    ->badge()
                    ->sortable(),
                TextColumn::make('unit')
                    ->sortable(),
                TextColumn::make('default_unit_price')
                    ->label('Unit price')
                    ->money('XAF')
                    ->sortable(),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('category')
                    ->options([
                        'Cement & Concrete' => 'Cement & Concrete',
                        'Blocks & Bricks' => 'Blocks & Bricks',
                        'Steel & Rebar' => 'Steel & Rebar',
                        'Aggregates' => 'Aggregates',
                        'Timber & Formwork' => 'Timber & Formwork',
                        'Roofing' => 'Roofing',
                        'Plumbing' => 'Plumbing',
                        'Electrical' => 'Electrical',
                        'Paint & Finishes' => 'Paint & Finishes',
                        'Tools & Equipment' => 'Tools & Equipment',
                        'Transport' => 'Transport',
                        'Labour Support' => 'Labour Support',
                        'Other' => 'Other',
                    ]),
                TernaryFilter::make('is_active')
                    ->label('Active'),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageMaterials::route('/'),
        ];
    }
}
