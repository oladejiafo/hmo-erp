<?php

namespace App\Imports;

use App\Models\Enrollee;
use Maatwebsite\Excel\Concerns\ToModel;

class EnrolleesImport implements ToModel
{
    /**
    * @param array $row
    *
    * @return \Illuminate\Database\Eloquent\Model|null
    */
    public function model(array $row)
    {
        return new Enrollee([
            //
        ]);
    }
}
